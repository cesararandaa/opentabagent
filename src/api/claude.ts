import Anthropic from '@anthropic-ai/sdk';
import type { PageContext, Action } from '../types';

export class ClaudeClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true, // Required for browser extension
      defaultHeaders: {
        'anthropic-dangerous-direct-browser-access': 'true'
      }
    });
  }

  async analyzePageAndGetActions(
    context: PageContext,
    userCommand: string
  ): Promise<Action[]> {
    const systemPrompt = `You are a browser automation assistant. Your job is to analyze a webpage and provide a list of actions to complete the user's task.

You can only perform these actions:
1. click(selector) - Click an element
2. fill(selector, value) - Fill a text input with a value
3. wait(milliseconds) - Wait for a specified time

Respond with a JSON array of actions. Each action should have:
- type: "click" | "fill" | "wait"
- selector: CSS selector for the element (for click and fill)
- value: text to fill (only for fill actions)
- description: brief description of what this action does

Example response:
[
  {"type": "click", "selector": "#accept-terms", "description": "Click the accept terms checkbox"},
  {"type": "fill", "selector": "input[name='email']", "value": "user@example.com", "description": "Fill email field"},
  {"type": "click", "selector": "button[type='submit']", "description": "Click submit button"}
]

IMPORTANT: Return ONLY the JSON array, no other text.`;

    const elementsText = context.elements
      .map((el, idx) => {
        const parts = [
          `[${idx}]`,
          `Tag: ${el.tag}`,
          el.type && `Type: ${el.type}`,
          el.selector && `Selector: ${el.selector}`,
          el.id && `ID: ${el.id}`,
          el.className && `Class: ${el.className}`,
          el.text && `Text: "${el.text}"`,
          el.placeholder && `Placeholder: "${el.placeholder}"`,
          el.name && `Name: ${el.name}`,
          el.value && `Value: "${el.value}"`,
          el.checked !== undefined && `Checked: ${el.checked}`,
          el.disabled && `Disabled: ${el.disabled}`
        ].filter(Boolean);
        return parts.join(' | ');
      })
      .join('\n');

    const userPrompt = `Page URL: ${context.url}
Page Title: ${context.title}

Interactive Elements:
${elementsText}

User Command: ${userCommand}

Please analyze the page and provide actions to complete this task.`;

    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: context.screenshot
              ? [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: 'image/png',
                      data: context.screenshot
                    }
                  },
                  {
                    type: 'text',
                    text: userPrompt
                  }
                ]
              : userPrompt
          }
        ]
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Extract JSON from the response
      const text = content.text.trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Could not find JSON array in Claude response');
      }

      const actions: Action[] = JSON.parse(jsonMatch[0]);
      return actions;
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  }
}
