import React, { useState } from 'react';
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
  Smartphone,
  Mic,
  Sparkles,
  Image as ImageIcon,
  Highlighter,
  Palette,
  Check
} from 'lucide-react';
import { AppSettings, NoteTab, HIGHLIGHT_COLORS, FONT_COLORS } from '../types';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeNote: NoteTab;
  settings: AppSettings;
  onSaveFile: () => void;
  onOpenFile: () => void;
  onFormat: (type: 'bold' | 'italic' | 'underline') => void;
  onHighlight: (color: string) => void;
  onSetFontColor: (color: string) => void;
  onColorSelection: (color: string) => void;
  onToggleBarPosition: () => void;
  onToggleTheme: () => void;
  onNewTab: () => void;
  onDeleteCurrentNote: () => void;
  onOpenSearch: () => void;
  onDuplicateNote: () => void;
  onOpenVoiceTyping: () => void;
  onOpenGeminiSearch: () => void;
  onOpenImageModal: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onClose,
  activeNote,
  settings,
  onSaveFile,
  onOpenFile,
  onFormat,
  onHighlight,
  onSetFontColor,
  onColorSelection,
  onToggleBarPosition,
  onToggleTheme,
  onNewTab,
  onDeleteCurrentNote,
  onOpenSearch,
  onDuplicateNote,
  onOpenVoiceTyping,
  onOpenGeminiSearch,
  onOpenImageModal,
}) => {
  // Local state for color selectors in menu
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<string>(
    settings.highlightColor || HIGHLIGHT_COLORS[0].value // Default: Amarelo
  );
  const [selectedFontColor, setSelectedFontColor] = useState<string>(
    activeNote.fontColor || settings.fontColor || ''
  );

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
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-slate-700/50 bg-slate-900 text-slate-100 shadow-2xl p-4 sm:p-6 sm:max-w-lg sm:mx-auto"
          >
            {/* Handle Drag Bar */}
            <div className="flex justify-center mb-2">
              <div className="w-12 h-1.5 rounded-full bg-slate-600/80" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-100">Menu de Opções</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      v3.4
                    </span>
                  </div>
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
              {/* Novidades v3.0: Voz, Gemini AI & Imagem */}
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-emerald-400 uppercase px-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Recursos Inteligentes (v3.0)
                </span>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {/* Escrever por Voz */}
                  <button
                    id="menu-voice-typing-btn"
                    onClick={() => {
                      onClose();
                      onOpenVoiceTyping();
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 active:scale-95 transition text-center group"
                  >
                    <div className="p-2 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-950/40 mb-1.5 group-hover:scale-105 transition">
                      <Mic className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200">Escrever por Voz</span>
                    <span className="text-[10px] text-rose-300/80">Ditado pt-BR</span>
                  </button>

                  {/* Pesquisar com Gemini */}
                  <button
                    id="menu-gemini-search-btn"
                    onClick={() => {
                      onClose();
                      onOpenGeminiSearch();
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 active:scale-95 transition text-center group"
                  >
                    <div className="p-2 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-950/40 mb-1.5 group-hover:scale-105 transition">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200">Pesquisar Gemini</span>
                    <span className="text-[10px] text-indigo-300/80">IA Integrada</span>
                  </button>

                  {/* Imagens */}
                  <button
                    id="menu-image-support-btn"
                    onClick={() => {
                      onClose();
                      onOpenImageModal();
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 active:scale-95 transition text-center group"
                  >
                    <div className="p-2 rounded-xl bg-pink-500 text-white shadow-md shadow-pink-950/40 mb-1.5 group-hover:scale-105 transition">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200">Imagens</span>
                    <span className="text-[10px] text-pink-300/80">
                      {activeNote.images?.length || 0} na nota
                    </span>
                  </button>
                </div>
              </div>

              {/* Botão para Alterar Cor da Fonte */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Cor da Fonte (Texto)
                    </span>
                  </div>
                  {selectedFontColor && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                      style={{ borderColor: selectedFontColor, color: selectedFontColor }}
                    >
                      Cor Ativa
                    </span>
                  )}
                </div>

                {/* Swatches de cores de fonte */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                  {FONT_COLORS.map((c) => {
                    const isSelected = selectedFontColor === c.value;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedFontColor(c.value)}
                        title={c.name}
                        className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center transition active:scale-90 border ${
                          isSelected ? 'ring-2 ring-violet-400 scale-110' : 'border-slate-600'
                        } ${!c.value ? 'bg-slate-700 text-slate-300' : ''}`}
                        style={c.value ? { backgroundColor: c.value } : {}}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-sm stroke-[3]" />}
                        {!c.value && !isSelected && <span className="text-[9px] font-bold">Auto</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Actions for font color */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    id="btn-apply-font-color-note"
                    onClick={() => {
                      onSetFontColor(selectedFontColor);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-medium border border-slate-600 transition"
                  >
                    <span>Aplicar na Aba</span>
                  </button>

                  <button
                    type="button"
                    id="btn-color-selection-text"
                    onClick={() => {
                      onColorSelection(selectedFontColor);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-xs active:scale-95 transition"
                  >
                    <span>Colorir Seleção</span>
                  </button>
                </div>
              </div>

              {/* Marcar Texto (Marca-Texto) com Amarelo por Padrão e Outras Opções */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Highlighter className="w-4 h-4 text-amber-300" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Marcar Texto (Marca-Texto)
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-medium">
                    Amarelo por padrão
                  </span>
                </div>

                {/* Paleta de Cores de Marca-Texto */}
                <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                  {HIGHLIGHT_COLORS.map((h) => {
                    const isSelected = selectedHighlightColor === h.value;
                    return (
                      <button
                        key={h.name}
                        type="button"
                        onClick={() => setSelectedHighlightColor(h.value)}
                        title={h.name}
                        className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center transition active:scale-90 border-2 ${
                          isSelected ? 'ring-2 ring-white scale-110 border-slate-900' : 'border-slate-600'
                        }`}
                        style={{ backgroundColor: h.value }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                {/* Botão de Marcar / Desmarcar Texto Selecionado */}
                <button
                  type="button"
                  id="btn-apply-highlight-text"
                  onClick={() => {
                    onHighlight(selectedHighlightColor);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs shadow-md transition active:scale-98 text-slate-900"
                  style={{ backgroundColor: selectedHighlightColor }}
                >
                  <Highlighter className="w-4 h-4 stroke-[2.5]" />
                  <span>Marcar / Desmarcar Texto Selecionado</span>
                </button>
              </div>

              {/* Formatação Básica (Negrito, Itálico, Sublinhado) */}
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-1">
                  Outras Formatações
                </span>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  <button
                    id="menu-format-bold-button"
                    onClick={() => {
                      onFormat('bold');
                      onClose();
                    }}
                    className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700/80 active:scale-95 transition border border-slate-700/70 text-slate-200"
                  >
                    <Bold className="w-5 h-5 mb-1 text-amber-400" />
                    <span className="text-xs font-semibold">Negrito</span>
                  </button>

                  <button
                    id="menu-format-italic-button"
                    onClick={() => {
                      onFormat('italic');
                      onClose();
                    }}
                    className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700/80 active:scale-95 transition border border-slate-700/70 text-slate-200"
                  >
                    <Italic className="w-5 h-5 mb-1 text-violet-400" />
                    <span className="text-xs font-semibold">Itálico</span>
                  </button>

                  <button
                    id="menu-format-underline-button"
                    onClick={() => {
                      onFormat('underline');
                      onClose();
                    }}
                    className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700/80 active:scale-95 transition border border-slate-700/70 text-slate-200"
                  >
                    <Underline className="w-5 h-5 mb-1 text-cyan-400" />
                    <span className="text-xs font-semibold">Sublinhado</span>
                  </button>
                </div>
              </div>

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
                      <Save className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-emerald-200 group-hover:text-emerald-100">
                        Salvar .txt
                      </div>
                      <div className="text-[10px] text-emerald-400/80 leading-tight">
                        No aparelho
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
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-sky-200 group-hover:text-sky-100">
                        Abrir .txt
                      </div>
                      <div className="text-[10px] text-sky-400/80 leading-tight">
                        Do aparelho
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Configurações de Layout */}
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-1">
                  Configurações e Layout
                </span>
                <div className="space-y-2 mt-1.5">
                  <button
                    id="menu-toggle-bar-position-button"
                    onClick={onToggleBarPosition}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-99 transition border border-slate-700/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/20">
                        <ArrowDownUp className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-xs text-slate-100">
                          Posição da Barra
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Fixar na parte de {settings.barPosition === 'top' ? 'baixo da tela' : 'cima (topo)'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-700 text-indigo-300 border border-indigo-500/30">
                      {settings.barPosition === 'top' ? 'No Topo' : 'Na Base'}
                    </span>
                  </button>

                  <button
                    id="menu-toggle-theme-button"
                    onClick={onToggleTheme}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-99 transition border border-slate-700/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${
                        settings.theme === 'dark'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      }`}>
                        {settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-xs text-slate-100">
                          Tema Visual
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Alternar para tema {settings.theme === 'dark' ? 'Claro' : 'Escuro'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">
                      {settings.theme === 'dark' ? 'Tema Escuro' : 'Tema Claro'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Utility Tools */}
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-1">
                  Mais Ferramentas
                </span>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    id="menu-quick-new-tab-button"
                    onClick={() => {
                      onNewTab();
                      onClose();
                    }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/50"
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
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/50"
                  >
                    <Search className="w-4 h-4 text-sky-400" />
                    <span>Localizar / Trocar</span>
                  </button>

                  <button
                    id="menu-duplicate-button"
                    onClick={() => {
                      onDuplicateNote();
                      onClose();
                    }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/50"
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
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-medium border border-rose-900/40"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Fechar / Limpar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom info */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Bloco de Notas Android • v3.0</span>
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
