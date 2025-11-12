import type { Message } from './types';

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Check if content script is loaded, inject if not
async function ensureContentScriptLoaded(tabId: number): Promise<boolean> {
  try {
    // Try to send a ping message
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    return true;
  } catch (error) {
    // Content script not loaded, try to inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      // Wait a bit for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    } catch (injectError) {
      console.error('Cannot inject content script:', injectError);
      return false;
    }
  }
}

// Message relay between side panel and content scripts
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  console.log('Background received message:', message.type);

  // Handle messages that need to go to the active tab's content script
  if (message.type === 'GET_PAGE_CONTEXT' || message.type === 'EXECUTE_ACTIONS') {
    // Query for active tab in last focused window (not currentWindow, which might be the side panel)
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      // Check if tab URL is valid for content scripts
      const url = activeTab.url || '';
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
          url.startsWith('edge://') || url.startsWith('about:') || !url) {
        sendResponse({
          success: false,
          error: 'Cannot access this page. Content scripts cannot run on browser system pages.'
        });
        return;
      }

      // Ensure content script is loaded
      const isLoaded = await ensureContentScriptLoaded(activeTab.id);
      if (!isLoaded) {
        sendResponse({
          success: false,
          error: 'Cannot inject content script. This page may be protected or restricted.'
        });
        return;
      }

      // Send message to content script
      chrome.tabs.sendMessage(activeTab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message to content script:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse(response);
        }
      });
    });
    return true; // Keep the message channel open for async response
  }

  // Handle screenshot capture
  if (message.type === 'CAPTURE_SCREENSHOT') {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, {
            format: 'png'
          });
          // Remove the data:image/png;base64, prefix
          const base64 = dataUrl.split(',')[1];
          sendResponse({ success: true, screenshot: base64 });
        } catch (error) {
          console.error('Error capturing screenshot:', error);
          sendResponse({ success: false, error: String(error) });
        }
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true; // Keep the message channel open for async response
  }
});

console.log('Open Tab Agent background service worker initialized');
