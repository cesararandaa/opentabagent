// Message types for communication between extension components
export type MessageType =
  | 'PING'
  | 'GET_PAGE_CONTEXT'
  | 'EXECUTE_ACTIONS'
  | 'ACTION_RESULT'
  | 'CAPTURE_SCREENSHOT';

export interface Message {
  type: MessageType;
  data?: any;
}

// DOM element information
export interface DOMElement {
  selector: string;
  tag: string;
  type?: string;
  id?: string;
  className?: string;
  text?: string;
  placeholder?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
}

// Page context sent to Claude
export interface PageContext {
  url: string;
  title: string;
  elements: DOMElement[];
  screenshot?: string; // base64 encoded
}

// Action types the agent can perform
export type ActionType = 'click' | 'fill' | 'wait';

export interface Action {
  type: ActionType;
  selector: string;
  value?: string; // for 'fill' actions
  description?: string;
}

// Result of action execution
export interface ActionResult {
  success: boolean;
  action: Action;
  error?: string;
}

// Chat message in the side panel
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// AI Provider types
export type AIProvider = 'claude' | 'openai';

export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
}

// Storage keys
export const STORAGE_KEYS = {
  PROVIDER: 'ai_provider',
  CLAUDE_API_KEY: 'claude_api_key',
  OPENAI_API_KEY: 'openai_api_key',
  CHAT_HISTORY: 'chat_history'
} as const;
