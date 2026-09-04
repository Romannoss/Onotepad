export interface NoteImage {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

export interface NoteTab {
  id: string;
  tabNumber: number;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  fileName?: string;
  isModified?: boolean;
  images?: NoteImage[];
  fontColor?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  barPosition: 'top' | 'bottom';
  fontSize: number;
  fontFamily: 'monospace' | 'sans' | 'serif';
  showLineNumbers: boolean;
  wordWrap: boolean;
  autoSaveDelay: number;
  fontColor?: string;
  highlightColor?: string;
}

export type FormattingType = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'heading' | 'list' | 'code' | 'timestamp' | 'highlight';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface ColorOption {
  name: string;
  value: string;
  bgValue?: string;
}

export const HIGHLIGHT_COLORS: ColorOption[] = [
  { name: 'Amarelo (Padrão)', value: '#fef08a', bgValue: '#fef08a' },
  { name: 'Verde Lima', value: '#bbf7d0', bgValue: '#bbf7d0' },
  { name: 'Rosa Suave', value: '#fbcfe8', bgValue: '#fbcfe8' },
  { name: 'Azul Celeste', value: '#bae6fd', bgValue: '#bae6fd' },
  { name: 'Laranja Quente', value: '#fed7aa', bgValue: '#fed7aa' },
  { name: 'Roxo Lavanda', value: '#e9d5ff', bgValue: '#e9d5ff' },
];

export const FONT_COLORS: ColorOption[] = [
  { name: 'Padrão (Tema)', value: '' },
  { name: 'Azul Real', value: '#2563eb' },
  { name: 'Verde Esmeralda', value: '#10b981' },
  { name: 'Vermelho Rubi', value: '#ef4444' },
  { name: 'Âmbar Dourado', value: '#f59e0b' },
  { name: 'Violeta / Roxo', value: '#8b5cf6' },
  { name: 'Rosa Choque', value: '#ec4899' },
  { name: 'Ciano Turquesa', value: '#06b6d4' },
  { name: 'Grafite Intenso', value: '#334155' },
  { name: 'Branco Neve', value: '#f8fafc' },
];

