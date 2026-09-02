import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Save,
  FolderOpen,
  Bold,
  Italic,
  Underline,
  ArrowDownUp,
  Sun,
  Moon,
  Plus,
  Trash2,
  Search,
  FileText,
  Copy,
  Info,
  X,
  Smartphone
} from 'lucide-react';
import { AppSettings, NoteTab } from '../types';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeNote: NoteTab;
  settings: AppSettings;
  onSaveFile: () => void;
  onOpenFile: () => void;
  onFormat: (type: 'bold' | 'italic' | 'underline') => void;
  onToggleBarPosition: () => void;
  onToggleTheme: () => void;
  onNewTab: () => void;
  onDeleteCurrentNote: () => void;
  onOpenSearch: () => void;
  onDuplicateNote: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onClose,
  activeNote,
  settings,
  onSaveFile,
  onOpenFile,
  onFormat,
  onToggleBarPosition,
  onToggleTheme,
  onNewTab,
  onDeleteCurrentNote,
  onOpenSearch,
  onDuplicateNote,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            id="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
          />

          {/* Android Bottom Sheet / Drawer Modal */}
          <motion.div
            id="hamburger-menu-drawer"
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-slate-700/50 bg-slate-900 text-slate-100 shadow-2xl p-4 sm:p-6 sm:max-w-lg sm:mx-auto"
          >
            {/* Handle Drag Bar */}
            <div className="flex justify-center mb-3">
              <div className="w-12 h-1.5 rounded-full bg-slate-600/80" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base text-slate-100">Menu de Opções</h3>
                  <p className="text-xs text-slate-400">
                    {activeNote.title} • {activeNote.content.length} caracteres
                  </p>
                </div>
              </div>
              <button
                id="close-hamburger-menu-button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of Main Actions */}
            <div className="space-y-4">
              {/* File Storage Actions (Salvar / Abrir) */}
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-1">
                  Arquivos (.txt)
                </span>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    id="menu-save-file-button"
                    onClick={() => {
                      onSaveFile();
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600/25 active:scale-98 transition text-left group"
                  >
                    <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0 shadow-md shadow-emerald-950/40">
                      <Save className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-emerald-200 group-hover:text-emerald-100">
                        Salvar
                      </div>
                      <div className="text-[11px] text-emerald-400/80 leading-tight">
                        No aparelho (.txt)
                      </div>
                    </div>
                  </button>

                  <button
                    id="menu-open-file-button"
                    onClick={() => {
                      onOpenFile();
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-sky-600/15 border border-sky-500/30 hover:bg-sky-600/25 active:scale-98 transition text-left group"
                  >
                    <div className="p-2 rounded-xl bg-sky-500 text-white shrink-0 shadow-md shadow-sky-950/40">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-sky-200 group-hover:text-sky-100">
                        Abrir
                      </div>
                      <div className="text-[11px] text-sky-400/80 leading-tight">
                        Do aparelho (.txt)
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Text Formatting Actions (Negrito / Itálico / Sublinhado) */}
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-1">
                  Formatação de Texto
                </span>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  <button
                    id="menu-format-bold-button"
                    onClick={() => {
                      onFormat('bold');
                      onClose();
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800 hover:bg-slate-700/80 active:scale-95 transition border border-slate-700/70 text-slate-200"
                  >
                    <Bold className="w-6 h-6 mb-1 text-amber-400" />
                    <span className="text-xs font-semibold">Negrito</span>
                    <span className="text-[10px] text-slate-400">**texto**</span>
                  </button>

                  <button
                    id="menu-format-italic-button"
                    onClick={() => {
                      onFormat('italic');
                      onClose();
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800 hover:bg-slate-700/80 active:scale-95 transition border border-slate-700/70 text-slate-200"
                  >
                    <Italic className="w-6 h-6 mb-1 text-violet-400" />
                    <span className="text-xs font-semibold">Itálico</span>
                    <span className="text-[10px] text-slate-400">*texto*</span>
                  </button>

                  <button
                    id="menu-format-underline-button"
                    onClick={() => {
                      onFormat('underline');
                      onClose();
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800 hover:bg-slate-700/80 active:scale-95 transition border border-slate-700/70 text-slate-200"
                  >
                    <Underline className="w-6 h-6 mb-1 text-cyan-400" />
                    <span className="text-xs font-semibold">Sublinhado</span>
                    <span className="text-[10px] text-slate-400">&lt;u&gt;texto&lt;/u&gt;</span>
                  </button>
                </div>
              </div>

              {/* Layout and Customization Controls */}
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-1">
                  Configurações e Layout
                </span>
                <div className="space-y-2 mt-1.5">
                  {/* Toggle Bar Position (Top or Bottom) */}
                  <button
                    id="menu-toggle-bar-position-button"
                    onClick={() => {
                      onToggleBarPosition();
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-99 transition border border-slate-700/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/20">
                        <ArrowDownUp className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-slate-100">
                          Posição da Barra
                        </div>
                        <div className="text-xs text-slate-400">
                          Fixar na parte de {settings.barPosition === 'top' ? 'baixo da tela' : 'cima (topo)'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-700 text-indigo-300 border border-indigo-500/30">
                      {settings.barPosition === 'top' ? 'No Topo' : 'Na Base'}
                    </span>
                  </button>

                  {/* Toggle Light / Dark Theme */}
                  <button
                    id="menu-toggle-theme-button"
                    onClick={() => {
                      onToggleTheme();
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-99 transition border border-slate-700/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${
                        settings.theme === 'dark'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      }`}>
                        {settings.theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-slate-100">
                          Tema Visual
                        </div>
                        <div className="text-xs text-slate-400">
                          Alternar para tema {settings.theme === 'dark' ? 'Claro' : 'Escuro'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-700 text-slate-200">
                      {settings.theme === 'dark' ? 'Tema Escuro' : 'Tema Claro'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Utility Tools */}
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-1">
                  Ferramentas
                </span>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    id="menu-quick-new-tab-button"
                    onClick={() => {
                      onNewTab();
                      onClose();
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/50"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Nova Aba (+)</span>
                  </button>

                  <button
                    id="menu-search-button"
                    onClick={() => {
                      onOpenSearch();
                      onClose();
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/50"
                  >
                    <Search className="w-4 h-4 text-sky-400" />
                    <span>Localizar Texto</span>
                  </button>

                  <button
                    id="menu-duplicate-button"
                    onClick={() => {
                      onDuplicateNote();
                      onClose();
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/50"
                  >
                    <Copy className="w-4 h-4 text-purple-400" />
                    <span>Duplicar Aba</span>
                  </button>

                  <button
                    id="menu-delete-note-button"
                    onClick={() => {
                      onDeleteCurrentNote();
                      onClose();
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-medium border border-rose-900/40"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Fechar / Limpar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom info */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Bloco de Notas Android • v1.0</span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Salvamento Automático Ativo
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
