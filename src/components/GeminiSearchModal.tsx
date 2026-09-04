import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  Search,
  X,
  Check,
  Copy,
  Plus,
  ArrowRight,
  FileText,
  Loader2,
  RefreshCw,
  Lightbulb,
  AlignLeft,
  AlertCircle
} from 'lucide-react';

interface GeminiSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNoteTitle: string;
  activeNoteContent: string;
  onInsertAtCursor: (text: string) => void;
  onAppendToEnd: (text: string) => void;
  onCreateNewTabWithContent: (title: string, content: string) => void;
  theme: 'light' | 'dark';
}

export const GeminiSearchModal: React.FC<GeminiSearchModalProps> = ({
  isOpen,
  onClose,
  activeNoteTitle,
  activeNoteContent,
  onInsertAtCursor,
  onAppendToEnd,
  onCreateNewTabWithContent,
  theme,
}) => {
  const isDark = theme === 'dark';
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'search' | 'summarize' | 'expand' | 'fix'>('search');
  const [includeContext, setIncludeContext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSearch = async (overrideQuery?: string, overrideMode?: 'search' | 'summarize' | 'expand' | 'fix') => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    const m = overrideMode !== undefined ? overrideMode : mode;

    if (!q.trim() && m !== 'summarize') {
      setErrorMsg('Digite um termo ou pergunta para pesquisar.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const payload: any = {
        query: q.trim() || (m === 'summarize' ? 'Resumo da nota' : 'Pesquisa'),
        mode: m,
      };

      if (includeContext || m === 'summarize' || m === 'expand') {
        payload.context = activeNoteContent;
      }

      const res = await fetch('/api/gemini/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao consultar Gemini');
      }

      setResult(data.result);
    } catch (err: any) {
      console.error('Gemini search error:', err);
      setErrorMsg(err.message || 'Não foi possível completar a pesquisa com Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertAtCursor = () => {
    if (!result) return;
    onInsertAtCursor(result);
    onClose();
  };

  const handleAppendToEnd = () => {
    if (!result) return;
    onAppendToEnd(result);
    onClose();
  };

  const handleCreateNewTab = () => {
    if (!result) return;
    const shortTitle = query.trim().slice(0, 24) || 'Pesquisa Gemini';
    onCreateNewTabWithContent(shortTitle, result);
    onClose();
  };

  const quickPrompts = [
    { label: 'Resumir nota atual', mode: 'summarize' as const, query: 'Faça um resumo conciso dos pontos chave desta nota.' },
    { label: 'Explicar conceito', mode: 'search' as const, query: 'Explique de forma simples e direta o seguinte conceito: ' },
    { label: 'Idéias e tópicos', mode: 'expand' as const, query: 'Gere uma lista estruturada de tópicos e idéias sobre: ' },
    { label: 'Corrigir e melhorar texto', mode: 'fix' as const, query: activeNoteContent.slice(0, 300) || 'Revise a ortografia deste texto.' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            id="gemini-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs"
          />

          <motion.div
            id="gemini-modal-card"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`fixed inset-x-3 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:w-full sm:max-w-xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-700/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-900/40">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">Pesquisar com Gemini</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      v3.0 AI
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Pergunte, pesquise informações ou analise a nota "{activeNoteTitle}"
                  </p>
                </div>
              </div>
              <button
                id="close-gemini-modal-btn"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-800/60 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Quick Prompts Bar */}
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Sugestões Rápidas:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 mt-1 no-scrollbar">
                  {quickPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQuery(p.query);
                        setMode(p.mode);
                        if (p.mode === 'summarize') setIncludeContext(true);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap shrink-0 border transition active:scale-95 ${
                        mode === p.mode && query === p.query
                          ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                          : isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/70'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search / Prompt Input */}
              <div className="space-y-2">
                <div className="relative">
                  <textarea
                    id="gemini-query-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    rows={3}
                    placeholder="O que você quer pesquisar ou perguntar ao Gemini? (Ex: Como funciona a fotossíntese?, Faça um roteiro de viagem...)"
                    className={`w-full p-3.5 rounded-2xl border text-sm leading-relaxed focus:outline-hidden transition ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                    }`}
                  />
                </div>

                {/* Options & Search Trigger Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeContext}
                      onChange={(e) => setIncludeContext(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-800 border-slate-700"
                    />
                    <span>Incluir texto da nota atual como contexto ({activeNoteContent.length} carac.)</span>
                  </label>

                  <button
                    type="button"
                    id="gemini-execute-search-btn"
                    onClick={() => handleSearch()}
                    disabled={isLoading || (!query.trim() && mode !== 'summarize')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold shadow-md active:scale-95 transition"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Pesquisando...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Pesquisar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <strong className="block font-semibold">Erro ao consultar Gemini</strong>
                    <span>{errorMsg}</span>
                  </div>
                </div>
              )}

              {/* Results Container */}
              {result && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Resposta do Gemini
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>

                  <div
                    className={`p-4 rounded-2xl border max-h-[280px] overflow-y-auto text-sm leading-relaxed ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                      <Markdown>{result}</Markdown>
                    </div>
                  </div>

                  {/* Actions for the returned content */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      id="gemini-insert-cursor-btn"
                      onClick={handleInsertAtCursor}
                      className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold active:scale-95 transition"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Inserir no Cursor</span>
                    </button>

                    <button
                      type="button"
                      id="gemini-append-end-btn"
                      onClick={handleAppendToEnd}
                      className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold active:scale-95 transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Inserir no Fim</span>
                    </button>

                    <button
                      type="button"
                      id="gemini-create-tab-btn"
                      onClick={handleCreateNewTab}
                      className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold active:scale-95 transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Criar Nova Aba</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/50 rounded-b-3xl shrink-0">
              <span>Modelo: Gemini 3.8 Flash</span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 text-xs"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
