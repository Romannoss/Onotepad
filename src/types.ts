export interface NoteTab {
  id: string;
  tabNumber: number;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  fileName?: string;
  isModified?: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  barPosition: 'top' | 'bottom';
  fontSize: number;
  fontFamily: 'monospace' | 'sans' | 'serif';
  showLineNumbers: boolean;
  wordWrap: boolean;
  autoSaveDelay: number;
}

export type FormattingType = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'heading' | 'list' | 'code' | 'timestamp';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'info' | 'warning' | 'error';
}
