# Open Tab Agent

A simple yet powerful open-source Chromium browser extension that uses AI (Claude or OpenAI) to automate simple tasks like clicking checkboxes, filling forms, and navigating websites.

## Features

- **BYOK (Bring Your Own Key)**: Uses your own API key (Anthropic Claude or OpenAI)
- **Multiple AI Providers**: Choose between Claude 3.5 Sonnet or GPT-4o
- **Side Panel Interface**: Clean chat interface for sending commands
- **Screenshot + DOM Analysis**: Combines visual and structural page understanding
- **Simple Actions**: Click elements, fill forms, and navigate with natural language
- **TypeScript**: Fully typed for better development experience
- **Open Source**: MIT licensed, contributions welcome!

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Chromium-based browser (Chrome, Edge, Brave, etc.)
- API key from either:
  - [Anthropic Claude](https://console.anthropic.com/)
  - [OpenAI](https://platform.openai.com/api-keys)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Extension

```bash
npm run build
```

This will create a `dist/` directory with the compiled extension.

### 3. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `dist/` folder from this project

### 4. Configure Your AI Provider

1. Click the Open Tab Agent extension icon in the toolbar
2. The side panel will open
3. Click the settings icon (⚙️) in the top right
4. Select your preferred AI provider (Claude or OpenAI)
5. Enter your API key:
   - Claude: starts with `sk-ant-`
   - OpenAI: starts with `sk-`
6. Click **Save Settings**

## Usage

### Basic Commands

Once the extension is loaded and your API key is configured:

1. Click the extension icon to open the side panel
2. Type a natural language command, such as:

   - "Click the accept checkbox"
   - "Fill in the email field with test@example.com"
   - "Click the submit button"
   - "Check all the checkboxes on this page"
   - "Fill out the contact form with my information"

3. Press Enter or click Send
4. Watch as the agent analyzes the page and executes the actions

### Example Commands

```
Click the "I agree to terms" checkbox and submit the form
```

```
Fill the search box with "typescript tutorial" and click search
```

```
Click the first "Add to Cart" button on the page
```

## Development

### Project Structure

```
browser-agent/
├── src/
│   ├── background.ts          # Service worker (message routing)
│   ├── content.ts             # Content script (DOM access & actions)
│   ├── types.ts               # Shared TypeScript types
│   ├── api/
│   │   └── claude.ts          # Claude API client
│   └── sidepanel/
│       ├── sidepanel.html     # Side panel UI
│       ├── sidepanel.ts       # Side panel logic
│       └── sidepanel.css      # Styling
├── dist/                      # Build output (generated)
├── manifest.json              # Extension manifest
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── build.js                   # esbuild configuration
```

### Build Commands

- **Build once**: `npm run build`
- **Watch mode**: `npm run watch` (auto-rebuild on file changes)

### Reloading Changes

After making changes:

1. Run `npm run build` (or use watch mode)
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Open Tab Agent extension
4. Reload any open tabs where you want to test

## How It Works

1. **User Input**: You type a command in the side panel
2. **Page Analysis**: The content script extracts all interactive elements (buttons, inputs, checkboxes, etc.) from the current page
3. **Screenshot**: The extension captures a screenshot of the visible page
4. **Claude Analysis**: Both the DOM structure and screenshot are sent to Claude AI
5. **Action Planning**: Claude returns a list of actions to perform
6. **Execution**: The content script executes each action sequentially
7. **Results**: Success/failure of each action is displayed in the chat

## Supported Actions

The agent currently supports these action types:

- **click**: Click on buttons, links, checkboxes, or any clickable element
- **fill**: Fill text inputs and textareas with specified values
- **wait**: Wait for a specified duration (useful between actions)

## Limitations

- Only works on pages where the extension has permission
- Cannot interact with elements in iframes from different origins
- Cannot bypass CAPTCHAs or security measures
- Works best with simple, straightforward tasks
- Rate limits apply based on your Claude API usage tier

## Security & Privacy

- Your API keys are stored locally in Chrome's storage
- API keys are only sent to their respective providers (Anthropic or OpenAI)
- Screenshots and DOM data are only sent to your chosen AI provider
- No data is collected or stored by the extension beyond your local browser
- All communication with AI APIs is over HTTPS
- The extension is open source - you can audit the code yourself

## Troubleshooting

### "Failed to access page" error

- Make sure you're on a regular webpage (not chrome:// pages or extension pages)
- Try refreshing the page
- Check that the extension has permission for the current site

### API key not working

- Verify your API key is correct:
  - Claude: should start with `sk-ant-`
  - OpenAI: should start with `sk-`
- Check your API key has available credits:
  - [Anthropic Console](https://console.anthropic.com/) for Claude
  - [OpenAI Platform](https://platform.openai.com/usage) for OpenAI
- Make sure you're connected to the internet

### Actions not executing

- Ensure elements are visible and not in iframes
- Try more specific commands (e.g., "click the blue submit button" instead of "submit")
- Check the browser console for errors (F12 → Console tab)

## Contributing

We welcome contributions! This is an open-source project and we'd love your help making it better.

### Ways to Contribute

- 🐛 **Report bugs**: Open an issue describing the problem
- 💡 **Suggest features**: Share your ideas in discussions
- 📝 **Improve docs**: Help make documentation clearer
- 🔧 **Submit PRs**: Fix bugs or add features

### Getting Started

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed information on:

   - How the extension works (architecture, data flow)
   - Development setup and workflow
   - Code structure and key files
   - How to add new features
   - Testing guidelines

2. Fork the repository
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly with both AI providers
6. Submit a pull request

### Development Workflow

```bash
# Install dependencies
npm install

# Start watch mode for development
npm run watch

# Build for production
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for complete development documentation.

## License

MIT - See [LICENSE](LICENSE) file for details

## Disclaimer

This tool is for legitimate automation purposes only. Always respect website terms of service and robots.txt. Use responsibly and ethically.
