# Contributing to Open Tab Agent

Thank you for your interest in contributing to Open Tab Agent! This document explains how the extension works and how you can collaborate on the project.

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Development Setup](#development-setup)
- [Code Structure](#code-structure)
- [Development Workflow](#development-workflow)
- [Adding New Features](#adding-new-features)
- [Testing](#testing)
- [Contributing Guidelines](#contributing-guidelines)

---

## How It Works

Open Tab Agent is a Chrome extension that uses AI (Claude or OpenAI) to automate simple browser tasks through natural language commands.

### High-Level Flow

1. **User Command** → User types a command in the side panel (e.g., "Click the accept checkbox")
2. **Page Analysis** → Extension extracts DOM structure and captures a screenshot
3. **AI Processing** → Sends data to Claude/OpenAI which analyzes and returns actions
4. **Action Execution** → Extension executes actions (click, fill, etc.) on the page
5. **Results** → Shows success/failure in the chat interface

### Technical Flow

```
┌─────────────┐
│ Side Panel  │ (User types command)
│ (HTML/JS)   │
└──────┬──────┘
       │
       │ chrome.runtime.sendMessage()
       ▼
┌─────────────┐
│ Background  │ (Message router, screenshot capture)
│ Service     │
│ Worker      │
└──────┬──────┘
       │
       │ chrome.tabs.sendMessage()
       ▼
┌─────────────┐
│ Content     │ (DOM extraction, action execution)
│ Script      │ Runs in webpage context
└─────────────┘

       │
       │ HTTP Request
       ▼
┌─────────────┐
│ Claude or   │ (Analyzes screenshot + DOM)
│ OpenAI API  │ Returns action list
└─────────────┘
```

### Components

#### 1. Side Panel (`src/sidepanel/`)

- **Purpose**: User interface for chat and settings
- **What it does**:
  - Displays chat messages
  - Manages AI provider settings and API keys
  - Coordinates the entire workflow
  - Stores chat history in `chrome.storage`

#### 2. Background Service Worker (`src/background.ts`)

- **Purpose**: Message router and screenshot handler
- **What it does**:
  - Routes messages between side panel and content scripts
  - Captures screenshots using `chrome.tabs.captureVisibleTab()`
  - Injects content scripts dynamically when needed
  - Validates page URLs (blocks chrome:// pages, etc.)

#### 3. Content Script (`src/content.ts`)

- **Purpose**: Interacts with the actual webpage
- **What it does**:
  - Extracts interactive elements (buttons, inputs, checkboxes)
  - Generates CSS selectors for elements
  - Executes actions (click, fill) on the page
  - Runs in the webpage's context (has DOM access)

#### 4. AI Clients (`src/api/ai-client.ts`)

- **Purpose**: Communicate with AI providers
- **What it does**:
  - **ClaudeClient**: Uses Anthropic's Claude 3.5 Sonnet with vision
  - **OpenAIClient**: Uses OpenAI's GPT-4o with vision
  - Sends screenshot + DOM structure + user command
  - Parses JSON response containing actions

---

## Architecture

### Manifest V3 Extension Structure

```
browser-agent/
├── src/                          # Source code
│   ├── api/
│   │   ├── ai-client.ts         # AI provider clients (Claude & OpenAI)
│   │   └── claude.ts            # Legacy (can be deleted)
│   ├── sidepanel/
│   │   ├── sidepanel.html       # UI structure
│   │   ├── sidepanel.css        # Styling
│   │   └── sidepanel.ts         # Logic, chat, settings
│   ├── background.ts            # Service worker
│   ├── content.ts               # Content script
│   └── types.ts                 # Shared TypeScript types
├── dist/                         # Build output (git-ignored)
│   ├── background.js
│   ├── content.js
│   ├── sidepanel/
│   │   ├── sidepanel.html
│   │   ├── sidepanel.css
│   │   └── sidepanel.js
│   └── manifest.json
├── manifest.json                # Extension manifest
├── package.json                 # Dependencies
├── tsconfig.json               # TypeScript config
├── build.js                    # esbuild configuration
└── README.md                   # User documentation
```

### Data Flow

#### Message Passing

All components communicate via Chrome's message passing API:

```typescript
// Side panel → Background
chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTEXT' })

// Background → Content script
chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTEXT' })

// Content script → Response
sendResponse({ success: true, context: {...} })
```

#### Storage

Uses `chrome.storage.local` for:

- AI provider preference (`ai_provider`)
- API keys (`claude_api_key`, `openai_api_key`)
- Chat history (`chat_history`)

---

## Development Setup

### Prerequisites

- Node.js v18+
- npm or yarn
- A Chromium-based browser (Chrome, Edge, Brave)
- API key from Anthropic or OpenAI

### Initial Setup

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd browser-agent
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the extension**

   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

### Development Mode

For active development with auto-rebuild:

```bash
npm run watch
```

This will:

- Build the extension
- Watch for file changes
- Automatically rebuild on save
- Show build status in terminal

**After changes:**

1. Wait for rebuild to complete (watch terminal)
2. Go to `chrome://extensions/`
3. Click refresh icon on Open Tab Agent
4. Reload any test pages (if testing content script changes)

---

## Code Structure

### Key Files Explained

#### `src/types.ts`

Defines all TypeScript types used across the extension:

- `Message` - Message structure for chrome.runtime.sendMessage
- `PageContext` - DOM elements + screenshot
- `Action` - What the AI wants to do
- `ActionResult` - Result of executing an action
- `AIProvider` - 'claude' | 'openai'

#### `src/api/ai-client.ts`

Contains AI provider implementations:

```typescript
export interface AIClient {
  analyzePageAndGetActions(
    context: PageContext,
    userCommand: string
  ): Promise<Action[]>;
}

export class ClaudeClient implements AIClient { ... }
export class OpenAIClient implements AIClient { ... }

export function createAIClient(
  provider: AIProvider,
  apiKey: string
): AIClient { ... }
```

#### `src/content.ts`

Key functions:

- `extractPageContext()` - Finds all interactive elements
- `getSelector(element)` - Generates CSS selector
- `executeAction(action)` - Performs click/fill
- `executeActions(actions)` - Runs multiple actions sequentially

#### `src/background.ts`

Key functions:

- `ensureContentScriptLoaded()` - Dynamically injects content script
- Message routing for all message types
- Screenshot capture using Chrome APIs

#### `src/sidepanel/sidepanel.ts`

Key functions:

- `init()` - Load settings and chat history
- `handleSendCommand()` - Main workflow coordinator
- `getPageContext()`, `captureScreenshot()`, `executeActions()` - Chrome API wrappers

---

## Development Workflow

### Adding a New Action Type

Want to add a "scroll" action? Here's how:

1. **Update types** (`src/types.ts`):

   ```typescript
   export type ActionType = "click" | "fill" | "wait" | "scroll";
   ```

2. **Update AI prompt** (`src/api/ai-client.ts`):

   ```typescript
   const SYSTEM_PROMPT = `...
   4. scroll(selector, direction) - Scroll element into view
   ...`;
   ```

3. **Implement in content script** (`src/content.ts`):

   ```typescript
   async function executeAction(action: Action): Promise<ActionResult> {
     // ... existing code ...

     case 'scroll':
       element.scrollIntoView({ behavior: 'smooth' });
       return { success: true, action };
   }
   ```

4. **Test it**:
   ```bash
   npm run build
   # Reload extension
   # Try command: "Scroll to the footer"
   ```

### Adding a New AI Provider

Want to add Google Gemini?

1. **Install SDK**:

   ```bash
   npm install @google/generative-ai
   ```

2. **Update types** (`src/types.ts`):

   ```typescript
   export type AIProvider = "claude" | "openai" | "gemini";
   ```

3. **Create client** (`src/api/ai-client.ts`):

   ```typescript
   export class GeminiClient implements AIClient {
     async analyzePageAndGetActions(...) {
       // Implementation
     }
   }
   ```

4. **Update factory**:

   ```typescript
   export function createAIClient(provider, apiKey) {
     case 'gemini': return new GeminiClient(apiKey);
   }
   ```

5. **Update UI** (`src/sidepanel/sidepanel.html`):

   ```html
   <option value="gemini">Google Gemini</option>
   ```

6. **Update storage keys** and logic in `sidepanel.ts`

---

## Adding New Features

### Feature: Add Voice Input

**Files to modify:**

1. `src/sidepanel/sidepanel.html` - Add microphone button
2. `src/sidepanel/sidepanel.ts` - Add Web Speech API logic
3. `src/sidepanel/sidepanel.css` - Style the button
4. `manifest.json` - Add microphone permission (if needed)

**Implementation steps:**

1. Add button to HTML
2. Use `SpeechRecognition` API to capture voice
3. Set `commandInput.value` with transcribed text
4. Trigger `handleSendCommand()`

### Feature: Add Action History

**Files to modify:**

1. `src/types.ts` - Add `ActionHistory` type
2. `src/sidepanel/sidepanel.ts` - Store action results
3. `src/sidepanel/sidepanel.html` - Add history panel
4. `src/sidepanel/sidepanel.css` - Style history panel

---

## Testing

### Manual Testing Checklist

Before submitting a PR, test these scenarios:

- [ ] Install extension from scratch
- [ ] Configure Claude API key
- [ ] Configure OpenAI API key
- [ ] Switch between providers
- [ ] Execute simple click action
- [ ] Execute form fill action
- [ ] Test on protected page (should show error)
- [ ] Test with content script injection
- [ ] Clear storage and verify fresh start
- [ ] Check console for errors

### Testing with a Sample Page

Create `test.html`:

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>Test Page</h1>
    <input type="checkbox" id="terms" /> Accept Terms
    <br />
    <input type="text" id="name" placeholder="Your name" />
    <br />
    <input type="email" id="email" placeholder="Email" />
    <br />
    <button id="submit">Submit</button>
    <script>
      document.getElementById("submit").onclick = () => {
        alert("Form submitted!");
      };
    </script>
  </body>
</html>
```

Test commands:

- "Click the accept terms checkbox"
- "Fill the name field with John Doe"
- "Fill the email with test@example.com"
- "Click submit button"

### Debugging Tips

**Side Panel Issues:**

- Right-click side panel → Inspect
- Console shows side panel logs

**Background Worker Issues:**

- Go to `chrome://extensions/`
- Click "Service worker" link under extension
- Console shows background logs

**Content Script Issues:**

- Open DevTools on webpage (F12)
- Console shows content script logs
- Look for "Content script initialized" message

**API Issues:**

- Check Network tab for API requests
- Look for 401 (auth), 429 (rate limit), 500 (server) errors
- Verify API key format and validity

---

## Contributing Guidelines

### Before You Start

1. **Open an issue** describing what you want to add/fix
2. **Discuss the approach** with maintainers
3. **Fork the repository**
4. **Create a feature branch**: `git checkout -b feature/your-feature-name`

### Code Standards

- **TypeScript**: Use strict type checking
- **Formatting**: Use consistent indentation (2 spaces)
- **Naming**: Use camelCase for functions, PascalCase for classes/types
- **Comments**: Add comments for complex logic
- **Error handling**: Always wrap API calls in try-catch

### Commit Messages

Use conventional commits:

```
feat: add scroll action support
fix: resolve tab detection issue with side panel
docs: update installation instructions
refactor: simplify AI client factory
```

### Pull Request Process

1. **Update documentation** if adding features
2. **Test thoroughly** with both Claude and OpenAI
3. **Update README.md** if changing user-facing behavior
4. **Create PR** with clear description
5. **Respond to review** feedback promptly

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

How did you test this?

## Checklist

- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
- [ ] Works with both AI providers
```

---

## Project Roadmap

### Current Features

- ✅ Click elements
- ✅ Fill text inputs
- ✅ Screenshot + DOM analysis
- ✅ Claude & OpenAI support
- ✅ Side panel UI
- ✅ Chat history

### Planned Features

- [ ] Multi-step workflows
- [ ] Page navigation
- [ ] Form auto-fill from templates
- [ ] Hover actions
- [ ] Wait for element conditions
- [ ] Export/import action sequences
- [ ] Additional AI providers (Gemini, etc.)
- [ ] Keyboard shortcut support
- [ ] Dark mode

### Ideas Welcome

- Voice input
- Visual action replay
- Action scheduling
- Multi-tab coordination
- Custom action plugins

---

## Getting Help

- **Issues**: Open a GitHub issue
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: [Coming soon]

---

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on code, not people
- Help newcomers learn

---

## License

This project is open source under the MIT License. See LICENSE file for details.

---

## Questions?

If anything is unclear, please open an issue or discussion. We're here to help!

Happy coding! 🚀
