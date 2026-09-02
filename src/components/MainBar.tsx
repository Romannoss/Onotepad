import React from 'react';
import { Menu, Plus, Save, Sun, Moon, ArrowDownUp, Search, Bold, Italic, Underline } from 'lucide-react';
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
      <div className="flex items-center justify-between px-2 sm:px-4 h-14 gap-2">
        {/* Left Side: App Title / Note Indicator & "+" button shortcut */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-mainbar-new-tab"
            onClick={onNewTab}
            title="Criar nova aba (nota + número)"
            aria-label="Criar nova aba"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95 shadow-xs ${
              isDark
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden xs:inline">Nova Aba</span>
          </button>

          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-bold leading-tight truncate max-w-[120px] md:max-w-[180px]">
              {activeNote.title}
            </span>
            <span className="text-[10px] text-slate-400">
              {notes.length} {notes.length === 1 ? 'aba aberta' : 'abas abertas'}
            </span>
          </div>
        </div>

        {/* Quick Format Shortcuts Bar (In the middle for fast touch access) */}
        <div className="flex items-center gap-1 bg-slate-800/40 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-700/40">
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
            <span className="hidden sm:inline">Salvar .txt</span>
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
