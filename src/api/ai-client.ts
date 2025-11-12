import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { PageContext, Action, AIProvider } from '../types';

const SYSTEM_PROMPT = `You are a browser automation assistant. Your job is to analyze a webpage and provide a list of actions to complete the user's task.

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

export interface AIClient {
  analyzePageAndGetActions(context: PageContext, userCommand: string): Promise<Action[]>;
}

export class ClaudeClient implements AIClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
      defaultHeaders: {
        'anthropic-dangerous-direct-browser-access': 'true'
      }
    });
  }

  async analyzePageAndGetActions(
    context: PageContext,
    userCommand: string
  ): Promise<Action[]> {
    const elementsText = this.formatElements(context.elements);
    const userPrompt = this.buildUserPrompt(context.url, context.title, elementsText, userCommand);

    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
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

      return this.extractActions(content.text);
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  }

  private formatElements(elements: PageContext['elements']): string {
    return elements
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
  }

  private buildUserPrompt(url: string, title: string, elementsText: string, userCommand: string): string {
    return `Page URL: ${url}
Page Title: ${title}

Interactive Elements:
${elementsText}

User Command: ${userCommand}

Please analyze the page and provide actions to complete this task.`;
  }

  private extractActions(text: string): Action[] {
    const trimmed = text.trim();
    const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not find JSON array in response');
    }
    return JSON.parse(jsonMatch[0]);
  }
}

export class OpenAIClient implements AIClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async analyzePageAndGetActions(
    context: PageContext,
    userCommand: string
  ): Promise<Action[]> {
    const elementsText = this.formatElements(context.elements);
    const userPrompt = this.buildUserPrompt(context.url, context.title, elementsText, userCommand);

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        }
      ];

      if (context.screenshot) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${context.screenshot}`,
                detail: 'high'
              }
            },
            {
              type: 'text',
              text: userPrompt
            }
          ]
        });
      } else {
        messages.push({
          role: 'user',
          content: userPrompt
        });
      }

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 2048,
        temperature: 0.2
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return this.extractActions(content);
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }

  private formatElements(elements: PageContext['elements']): string {
    return elements
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
  }

  private buildUserPrompt(url: string, title: string, elementsText: string, userCommand: string): string {
    return `Page URL: ${url}
Page Title: ${title}

Interactive Elements:
${elementsText}

User Command: ${userCommand}

Please analyze the page and provide actions to complete this task.`;
  }

  private extractActions(text: string): Action[] {
    const trimmed = text.trim();
    const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not find JSON array in response');
    }
    return JSON.parse(jsonMatch[0]);
  }
}

export function createAIClient(provider: AIProvider, apiKey: string): AIClient {
  switch (provider) {
    case 'claude':
      return new ClaudeClient(apiKey);
    case 'openai':
      return new OpenAIClient(apiKey);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
