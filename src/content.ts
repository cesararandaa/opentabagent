import type { Message, PageContext, DOMElement, Action, ActionResult } from './types';

// Generate a unique CSS selector for an element
function getSelector(element: Element): string {
  // Try ID first
  if (element.id) {
    return `#${element.id}`;
  }

  // Try name attribute
  const name = element.getAttribute('name');
  if (name) {
    return `[name="${name}"]`;
  }

  // Try unique class combination
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(c => c);
    if (classes.length > 0) {
      const selector = `${element.tagName.toLowerCase()}.${classes.join('.')}`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }

  // Try placeholder for inputs
  const placeholder = element.getAttribute('placeholder');
  if (placeholder) {
    const selector = `${element.tagName.toLowerCase()}[placeholder="${placeholder}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // Fall back to tag name with index
  const tag = element.tagName.toLowerCase();
  const siblings = Array.from(element.parentElement?.children || []).filter(
    el => el.tagName === element.tagName
  );
  const index = siblings.indexOf(element);
  return `${tag}:nth-of-type(${index + 1})`;
}

// Extract interactive elements from the page
function extractPageContext(): PageContext {
  const elements: DOMElement[] = [];

  // Find all interactive elements
  const interactiveSelectors = [
    'input:not([type="hidden"])',
    'textarea',
    'button',
    'select',
    'a[href]',
    '[role="button"]',
    '[onclick]',
    '[contenteditable="true"]'
  ];

  const foundElements = document.querySelectorAll(interactiveSelectors.join(','));

  foundElements.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;

    // Skip invisible elements
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return;
    }

    const domElement: DOMElement = {
      selector: getSelector(el),
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      className: el.className && typeof el.className === 'string' ? el.className : undefined,
      text: el.textContent?.trim().substring(0, 100) || undefined
    };

    // Add input-specific attributes
    if (el instanceof HTMLInputElement) {
      domElement.type = el.type;
      domElement.name = el.name || undefined;
      domElement.placeholder = el.placeholder || undefined;
      domElement.value = el.value || undefined;
      domElement.checked = el.checked;
      domElement.disabled = el.disabled;
    } else if (el instanceof HTMLTextAreaElement) {
      domElement.name = el.name || undefined;
      domElement.placeholder = el.placeholder || undefined;
      domElement.value = el.value || undefined;
      domElement.disabled = el.disabled;
    } else if (el instanceof HTMLButtonElement || el instanceof HTMLSelectElement) {
      domElement.name = el.name || undefined;
      domElement.disabled = el.disabled;
    }

    elements.push(domElement);
  });

  return {
    url: window.location.href,
    title: document.title,
    elements: elements.slice(0, 100) // Limit to 100 elements to avoid huge payloads
  };
}

// Execute a single action
async function executeAction(action: Action): Promise<ActionResult> {
  console.log('Executing action:', action);

  try {
    if (action.type === 'wait') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Default 1 second wait
      return { success: true, action };
    }

    const element = document.querySelector(action.selector);
    if (!element) {
      return {
        success: false,
        action,
        error: `Element not found: ${action.selector}`
      };
    }

    if (!(element instanceof HTMLElement)) {
      return {
        success: false,
        action,
        error: `Element is not an HTMLElement: ${action.selector}`
      };
    }

    switch (action.type) {
      case 'click':
        element.click();
        return { success: true, action };

      case 'fill':
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.value = action.value || '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, action };
        } else {
          return {
            success: false,
            action,
            error: `Element is not an input or textarea: ${action.selector}`
          };
        }

      default:
        return {
          success: false,
          action,
          error: `Unknown action type: ${action.type}`
        };
    }
  } catch (error) {
    return {
      success: false,
      action,
      error: String(error)
    };
  }
}

// Execute multiple actions sequentially
async function executeActions(actions: Action[]): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const action of actions) {
    const result = await executeAction(action);
    results.push(result);

    // Stop if an action fails
    if (!result.success) {
      break;
    }

    // Add a small delay between actions
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  console.log('Content script received message:', message.type);

  if (message.type === 'PING') {
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_PAGE_CONTEXT') {
    const context = extractPageContext();
    sendResponse({ success: true, context });
    return true;
  }

  if (message.type === 'EXECUTE_ACTIONS') {
    const actions = message.data as Action[];
    executeActions(actions).then(results => {
      sendResponse({ success: true, results });
    });
    return true; // Keep the message channel open for async response
  }

  return false;
});

console.log('Open Tab Agent content script initialized');
