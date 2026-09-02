import React, { useRef, useEffect } from 'react';
import { Plus, X, Edit2, FileText } from 'lucide-react';
import { NoteTab } from '../types';

interface TabsStripProps {
  notes: NoteTab[];
  activeId: string;
  onSelectTab: (id: string) => void;
  onNewTab: () => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onRenameTab: (id: string) => void;
  theme: 'light' | 'dark';
}

export const TabsStrip: React.FC<TabsStripProps> = ({
  notes,
  activeId,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onRenameTab,
  theme,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active tab into view when activeId changes
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeId]);

  return (
    <div
      id="tabs-strip-container"
      className={`flex items-center w-full overflow-hidden border-b ${
        theme === 'dark'
          ? 'bg-slate-900 border-slate-800 text-slate-300'
          : 'bg-slate-200/90 border-slate-300 text-slate-700'
      }`}
    >
      {/* "+" Button on the left side to create new tab */}
      <button
        id="btn-new-tab-left"
        onClick={onNewTab}
        title="Criar nova aba (nota + número)"
        aria-label="Criar nova aba"
        className={`flex items-center justify-center h-11 w-12 shrink-0 border-r transition-all active:scale-95 group ${
          theme === 'dark'
            ? 'bg-emerald-600/20 text-emerald-400 border-slate-800 hover:bg-emerald-600/30'
            : 'bg-emerald-500/15 text-emerald-700 border-slate-300 hover:bg-emerald-500/25'
        }`}
      >
        <div className={`p-1 rounded-lg ${theme === 'dark' ? 'bg-emerald-500/30' : 'bg-emerald-500/20'} group-hover:scale-110 transition-transform`}>
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </div>
      </button>

      {/* Horizontally scrollable list of tabs */}
      <div
        ref={scrollContainerRef}
        className="flex items-center overflow-x-auto no-scrollbar scroll-smooth flex-1 py-1 px-1 gap-1.5"
      >
        {notes.map((note) => {
          const isActive = note.id === activeId;
          return (
            <div
              key={note.id}
              className={`group relative flex items-center h-9 max-w-[180px] min-w-[100px] rounded-lg transition-all border text-xs font-medium shrink-0 select-none ${
                isActive
                  ? theme === 'dark'
                    ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                    : 'bg-white text-slate-900 border-slate-300 shadow-sm'
                  : theme === 'dark'
                  ? 'bg-slate-900/60 text-slate-400 border-transparent hover:bg-slate-800/60 hover:text-slate-200'
                  : 'bg-slate-200/50 text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <button
                ref={isActive ? activeTabRef : null}
                id={`tab-button-${note.id}`}
                onClick={() => onSelectTab(note.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 flex-1 min-w-0 text-left h-full"
                title={`${note.title} (Toque duas vezes para renomear)`}
                onDoubleClick={() => onRenameTab(note.id)}
              >
                <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-400' : 'opacity-50'}`} />
                <span className="truncate font-medium">{note.title}</span>
              </button>

              {/* Rename & Close actions */}
              <div className="flex items-center pr-1 gap-0.5">
                <button
                  id={`rename-tab-${note.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenameTab(note.id);
                  }}
                  title="Renomear aba"
                  className="p-1 rounded opacity-0 group-hover:opacity-80 hover:opacity-100 hover:bg-slate-700/50 transition-opacity"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {notes.length > 1 && (
                  <button
                    id={`close-tab-${note.id}`}
                    onClick={(e) => onCloseTab(note.id, e)}
                    title="Fechar aba"
                    className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Active Tab bottom accent line */}
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
