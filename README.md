# Open Tab Agent

An open-source agent Chromium browser extension that uses AI to automate simple tasks like clicking checkboxes, filling forms, and navigating websites.

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

## Limitations

- Only works on pages where the extension has permission
- Cannot interact with elements in iframes from different origins
- Cannot bypass CAPTCHAs or security measures
- Works best with simple, straightforward tasks
- Rate limits apply based on your Claude API usage tier

## Security & Privacy

- API keys are stored locally in Chrome's storage
- Screenshots and DOM data are only sent to your chosen AI provider
- No data is collected or stored by the extension beyond your local browser

## Contributing

We welcome contributions! This is an open-source project and we'd love your help making it better.

## License

MIT - See [LICENSE](LICENSE) file for details

## Disclaimer

This tool is for legitimate automation purposes only. Always respect website terms of service and robots.txt. Use responsibly and ethically.
