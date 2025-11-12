import { createAIClient, type AIClient } from '../api/ai-client';
import type { ChatMessage, PageContext, ActionResult, Action, AIProvider } from '../types';
import { STORAGE_KEYS } from '../types';

// DOM elements
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;
const closeSettingsBtn = document.getElementById('closeSettingsBtn') as HTMLButtonElement;
const settingsPanel = document.getElementById('settingsPanel') as HTMLDivElement;
const providerSelect = document.getElementById('providerSelect') as HTMLSelectElement;
const claudeSettings = document.getElementById('claudeSettings') as HTMLDivElement;
const openaiSettings = document.getElementById('openaiSettings') as HTMLDivElement;
const claudeApiKeyInput = document.getElementById('claudeApiKeyInput') as HTMLInputElement;
const openaiApiKeyInput = document.getElementById('openaiApiKeyInput') as HTMLInputElement;
const saveSettingsBtn = document.getElementById('saveSettingsBtn') as HTMLButtonElement;
const chatMessages = document.getElementById('chatMessages') as HTMLDivElement;
const commandInput = document.getElementById('commandInput') as HTMLTextAreaElement;
const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
const statusBar = document.getElementById('statusBar') as HTMLDivElement;
const statusText = document.getElementById('statusText') as HTMLSpanElement;

let aiClient: AIClient | null = null;
let currentProvider: AIProvider = 'claude';
let chatHistory: ChatMessage[] = [];

// Initialize
async function init() {
  // Load settings from storage
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.PROVIDER,
    STORAGE_KEYS.CLAUDE_API_KEY,
    STORAGE_KEYS.OPENAI_API_KEY,
    STORAGE_KEYS.CHAT_HISTORY
  ]);

  // Set provider
  if (result[STORAGE_KEYS.PROVIDER]) {
    currentProvider = result[STORAGE_KEYS.PROVIDER] as AIProvider;
    providerSelect.value = currentProvider;
  }

  // Set API keys
  if (result[STORAGE_KEYS.CLAUDE_API_KEY]) {
    claudeApiKeyInput.value = result[STORAGE_KEYS.CLAUDE_API_KEY];
  }
  if (result[STORAGE_KEYS.OPENAI_API_KEY]) {
    openaiApiKeyInput.value = result[STORAGE_KEYS.OPENAI_API_KEY];
  }

  // Initialize AI client if we have the right API key
  const apiKey = currentProvider === 'claude'
    ? result[STORAGE_KEYS.CLAUDE_API_KEY]
    : result[STORAGE_KEYS.OPENAI_API_KEY];

  if (apiKey) {
    aiClient = createAIClient(currentProvider, apiKey);
    sendBtn.disabled = false;
    addSystemMessage(`${currentProvider === 'claude' ? 'Claude' : 'OpenAI'} API key loaded. You can start sending commands!`);
  }

  // Show correct provider settings
  updateProviderUI();

  // Load chat history
  if (result[STORAGE_KEYS.CHAT_HISTORY]) {
    chatHistory = result[STORAGE_KEYS.CHAT_HISTORY];
    chatHistory.forEach(msg => {
      if (msg.role !== 'system') {
        addMessage(msg.role, msg.content);
      }
    });
  }
}

// Update UI based on selected provider
function updateProviderUI() {
  if (providerSelect.value === 'claude') {
    claudeSettings.classList.remove('hidden');
    openaiSettings.classList.add('hidden');
  } else {
    claudeSettings.classList.add('hidden');
    openaiSettings.classList.remove('hidden');
  }
}

// Event listeners
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
  settingsPanel.classList.add('hidden');
});

providerSelect.addEventListener('change', () => {
  updateProviderUI();
});

saveSettingsBtn.addEventListener('click', async () => {
  const selectedProvider = providerSelect.value as AIProvider;
  const claudeKey = claudeApiKeyInput.value.trim();
  const openaiKey = openaiApiKeyInput.value.trim();

  // Validate the selected provider has an API key
  if (selectedProvider === 'claude') {
    if (!claudeKey) {
      alert('Please enter a Claude API key');
      return;
    }
    if (!claudeKey.startsWith('sk-ant-')) {
      alert('Invalid Claude API key format. Should start with sk-ant-');
      return;
    }
  } else {
    if (!openaiKey) {
      alert('Please enter an OpenAI API key');
      return;
    }
    if (!openaiKey.startsWith('sk-')) {
      alert('Invalid OpenAI API key format. Should start with sk-');
      return;
    }
  }

  // Save settings
  await chrome.storage.local.set({
    [STORAGE_KEYS.PROVIDER]: selectedProvider,
    [STORAGE_KEYS.CLAUDE_API_KEY]: claudeKey || undefined,
    [STORAGE_KEYS.OPENAI_API_KEY]: openaiKey || undefined
  });

  // Update current provider and client
  currentProvider = selectedProvider;
  const apiKey = selectedProvider === 'claude' ? claudeKey : openaiKey;
  aiClient = createAIClient(selectedProvider, apiKey);
  sendBtn.disabled = false;

  settingsPanel.classList.add('hidden');
  addSystemMessage(`Settings saved! Using ${selectedProvider === 'claude' ? 'Claude' : 'OpenAI'}.`);
});

sendBtn.addEventListener('click', () => {
  handleSendCommand();
});

commandInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSendCommand();
  }
});

// Show status message
function showStatus(message: string) {
  statusText.textContent = message;
  statusBar.classList.remove('hidden');
}

function hideStatus() {
  statusBar.classList.add('hidden');
}

// Add message to chat
function addMessage(role: 'user' | 'assistant' | 'system' | 'error', content: string) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = content;

  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addSystemMessage(content: string) {
  addMessage('system', content);
}

function addErrorMessage(content: string) {
  addMessage('error', content);
}

// Save chat history
async function saveChatHistory() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.CHAT_HISTORY]: chatHistory.slice(-50) // Keep last 50 messages
  });
}

// Get page context from content script
async function getPageContext(): Promise<PageContext | null> {
  try {
    const response: any = await chrome.runtime.sendMessage({
      type: 'GET_PAGE_CONTEXT'
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to get page context');
    }

    return response.context;
  } catch (error) {
    console.error('Error getting page context:', error);
    addErrorMessage(`Failed to access page: ${error}`);
    return null;
  }
}

// Capture screenshot
async function captureScreenshot(): Promise<string | null> {
  try {
    const response: any = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT'
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to capture screenshot');
    }

    return response.screenshot;
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    return null;
  }
}

// Execute actions on the page
async function executeActions(actions: Action[]): Promise<ActionResult[]> {
  try {
    const response: any = await chrome.runtime.sendMessage({
      type: 'EXECUTE_ACTIONS',
      data: actions
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to execute actions');
    }

    return response.results;
  } catch (error) {
    console.error('Error executing actions:', error);
    addErrorMessage(`Failed to execute actions: ${error}`);
    return [];
  }
}

// Handle send command
async function handleSendCommand() {
  const command = commandInput.value.trim();
  if (!command || !aiClient) {
    return;
  }

  // Clear input
  commandInput.value = '';
  sendBtn.disabled = true;

  // Add user message
  addMessage('user', command);
  chatHistory.push({
    role: 'user',
    content: command,
    timestamp: Date.now()
  });

  try {
    // Step 1: Get page context
    showStatus('Analyzing page...');
    const context = await getPageContext();
    if (!context) {
      sendBtn.disabled = false;
      hideStatus();
      return;
    }

    // Step 2: Capture screenshot
    showStatus('Capturing screenshot...');
    const screenshot = await captureScreenshot();
    if (screenshot) {
      context.screenshot = screenshot;
    }

    // Step 3: Ask AI for actions
    const providerName = currentProvider === 'claude' ? 'Claude' : 'OpenAI';
    showStatus(`Asking ${providerName}...`);
    const actions = await aiClient.analyzePageAndGetActions(context, command);

    if (actions.length === 0) {
      addMessage('assistant', 'I could not determine any actions to take for this command.');
      chatHistory.push({
        role: 'assistant',
        content: 'I could not determine any actions to take for this command.',
        timestamp: Date.now()
      });
      sendBtn.disabled = false;
      hideStatus();
      return;
    }

    // Show planned actions
    const actionsHtml = actions
      .map((a, i) => `${i + 1}. ${a.description || a.type}`)
      .join('<br>');
    addMessage('assistant', `I will perform these actions:<br>${actionsHtml}`);

    // Step 4: Execute actions
    showStatus('Executing actions...');
    const results = await executeActions(actions);

    // Step 5: Show results
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    let resultMessage = `Completed ${successCount} of ${results.length} actions.`;
    if (failureCount > 0) {
      resultMessage += '<br><br>Failed actions:<ul class="action-list">';
      results
        .filter(r => !r.success)
        .forEach(r => {
          resultMessage += `<li class="action-item error">${r.action.description || r.action.type}: ${r.error}</li>`;
        });
      resultMessage += '</ul>';
    } else {
      resultMessage += ' All actions completed successfully!';
    }

    addMessage('assistant', resultMessage);
    chatHistory.push({
      role: 'assistant',
      content: resultMessage,
      timestamp: Date.now()
    });

    await saveChatHistory();
  } catch (error) {
    console.error('Error handling command:', error);
    addErrorMessage(`Error: ${error}`);
  } finally {
    sendBtn.disabled = false;
    hideStatus();
  }
}

// Initialize on load
init();
