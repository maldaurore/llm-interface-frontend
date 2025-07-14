export enum Sender {
  USER = 'user',
  AI = 'ai',
}

export interface ChatMessage {
  _id: string;
  text: string;
  sender: Sender;
  timestamp: number;
  isError?: boolean;
  groundingChunks?: object[];
}

export interface ModelOption {
  id: string;
  name: string;
  type: string
}

export interface Chat {
  _id: string;
  title: string;
  messages?: ChatMessage[];
  user?: string;
  model?: string;
  threadId?: string | null;
  braianSessionId?: string | null;
  createdAt: number;
}

export interface NewChat {
  _id: string;
  title: string;
}