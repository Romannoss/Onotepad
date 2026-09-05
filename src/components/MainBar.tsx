import React from 'react';
import {
  Menu,
  Plus,
  Save,
  Bold,
  Italic,
  Underline,
  Mic,
  Sparkles,
  Image as ImageIcon,
  Highlighter,
  FileText
} from 'lucide-react';
import { AppSettings, NoteTab } from '../types';
import { TabsStrip } from './TabsStrip';

interface MainBarProps {
  notes: NoteTab[];
  activeNote: NoteTab;
  settings: AppSettings;
  onSelectTab: (id: string) => void;
  onNewTab: () => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onRenameTab: (id: string) => void;
  onOpenMenu: () => void;
  onSaveFile: () => void;
  onFormat: (type: 'bold' | 'italic' | 'underline') => void;
  onHighlight: () => void;
  onOpenVoiceTyping: () => void;
  onOpenGeminiSearch: () => void;
  onOpenImageModal: () => void;
  activeHighlightColor: string;
  isSaving: boolean;
}

export const MainBar: React.FC<MainBarProps> = ({
  notes,
  activeNote,
  settings,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onRenameTab,
  onOpenMenu,
  onSaveFile,
  onFormat,
  onHighlight,
  onOpenVoiceTyping,
  onOpenGeminiSearch,
  onOpenImageModal,
  activeHighlightColor,
  isSaving,
}) => {
  const isDark = settings.theme === 'dark';

  return (
    <header
      id="main-app-bar"
      className={`w-full z-30 shadow-md transition-colors ${
        settings.barPosition === 'top' ? 'order-1 border-b' : 'order-3 border-t'
      } ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-100 backdrop-blur-md'
          : 'bg-slate-100/95 border-slate-300 text-slate-800 backdrop-blur-md'
      }`}
    >
      {/* Primary Toolbar */}
      <div className="flex items-center justify-between px-2 sm:px-3 h-14 gap-1.5 overflow-x-auto no-scrollbar">
        {/* Left Side: App Brand & Title */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-1 py-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className={`font-bold text-sm tracking-tight hidden sm:inline ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              Onotepad
            </span>
          </div>
        </div>

        {/* Action Shortcuts Bar: Voice, Gemini, Image, Highlighter, Bold, Italic, Underline */}
        <div className="flex items-center gap-1 bg-slate-800/40 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-700/40 shrink-0">
          {/* Escrever por Voz */}
          <button
            id="quick-btn-voice"
            onClick={onOpenVoiceTyping}
            title="Escrever por Voz (Ditado)"
            aria-label="Escrever por Voz"
            className="p-2 rounded-lg hover:bg-rose-500/20 text-rose-400 transition active:scale-90"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Pesquisar com Gemini */}
          <button
            id="quick-btn-gemini"
            onClick={onOpenGeminiSearch}
            title="Pesquisar com Gemini AI"
            aria-label="Pesquisar com Gemini AI"
            className="p-2 rounded-lg hover:bg-indigo-500/20 text-indigo-400 transition active:scale-90"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Adicionar Imagem */}
          <button
            id="quick-btn-image"
            onClick={onOpenImageModal}
            title="Adicionar ou Gerenciar Imagens"
            aria-label="Imagens da Nota"
            className="p-2 rounded-lg hover:bg-pink-500/20 text-pink-400 transition active:scale-90 relative"
          >
            <ImageIcon className="w-4 h-4" />
            {(activeNote.images?.length || 0) > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-pink-500" />
            )}
          </button>

          <div className="w-px h-5 bg-slate-700/60 mx-0.5" />

          {/* Marcar Texto (Marca-Texto) com indicador de cor */}
          <button
            id="quick-btn-highlight"
            onClick={onHighlight}
            title={`Marcar / Desmarcar Texto (Marca-Texto ${activeHighlightColor})`}
            aria-label="Marcar ou Desmarcar Texto"
            className="p-2 rounded-lg hover:bg-amber-500/20 text-amber-300 transition active:scale-90 relative"
          >
            <Highlighter className="w-4 h-4" />
            <span
              className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-slate-900"
              style={{ backgroundColor: activeHighlightColor }}
            />
          </button>

          {/* Bold, Italic, Underline */}
          <button
            id="quick-btn-bold"
            onClick={() => onFormat('bold')}
            title="Negrito (**texto**)"
            className={`p-2 rounded-lg transition active:scale-90 ${
              isDark
                ? 'hover:bg-slate-800 text-amber-300'
                : 'hover:bg-slate-200 text-amber-600'
            }`}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            id="quick-btn-italic"
            onClick={() => onFormat('italic')}
            title="Itálico (*texto*)"
            className={`p-2 rounded-lg transition active:scale-90 ${
              isDark
                ? 'hover:bg-slate-800 text-violet-300'
                : 'hover:bg-slate-200 text-violet-600'
            }`}
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            id="quick-btn-underline"
            onClick={() => onFormat('underline')}
            title="Sublinhado (<u>texto</u>)"
            className={`p-2 rounded-lg transition active:scale-90 ${
              isDark
                ? 'hover:bg-slate-800 text-cyan-300'
                : 'hover:bg-slate-200 text-cyan-600'
            }`}
          >
            <Underline className="w-4 h-4" />
          </button>
        </div>

        {/* Right Side: Quick Save & Hamburger Menu Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Save direct action */}
          <button
            id="quick-save-button"
            onClick={onSaveFile}
            title="Salvar arquivo no aparelho Android (.txt)"
            aria-label="Salvar arquivo .txt"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition active:scale-95 border ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-emerald-600 border-slate-300'
            }`}
          >
            <Save className="w-4 h-4" />
            <span className="hidden md:inline">Salvar .txt</span>
          </button>

          {/* Right Hamburger Menu Button */}
          <button
            id="hamburger-menu-button"
            onClick={onOpenMenu}
            aria-label="Abrir menu de opções"
            title="Menu de opções"
            className={`flex items-center justify-center w-11 h-11 rounded-xl transition active:scale-90 border shadow-xs ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
            }`}
          >
            <Menu className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Embedded Tabs Strip with "+" button on left and tabs */}
      <TabsStrip
        notes={notes}
        activeId={activeNote.id}
        onSelectTab={onSelectTab}
        onNewTab={onNewTab}
        onCloseTab={onCloseTab}
        onRenameTab={onRenameTab}
        theme={settings.theme}
      />
    </header>
  );
};
