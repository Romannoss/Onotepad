import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Replace, X, ChevronDown, ChevronUp } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onReplaceAll: (search: string, replace: string) => void;
  onHighlightMatch?: (index: number) => void;
  theme: 'light' | 'dark';
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  content,
  onReplaceAll,
  theme,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Calculate occurrences
  const matchCount = searchTerm.trim()
    ? (content.match(new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
    : 0;

  const handleReplace = () => {
    if (!searchTerm) return;
    onReplaceAll(searchTerm, replaceTerm);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-md rounded-2xl p-5 shadow-2xl border ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-700 text-slate-100'
              : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-sky-500" />
              <h3 className="font-bold text-base">Localizar e Substituir</h3>
            </div>
            <button
              id="btn-close-search-modal"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-400">Localizar texto</label>
                {searchTerm && (
                  <span className={`text-[11px] font-semibold ${matchCount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {matchCount} {matchCount === 1 ? 'ocorrência' : 'ocorrências'}
                  </span>
                )}
              </div>
              <input
                ref={searchInputRef}
                id="search-input-field"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digitar texto para buscar..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Substituir por</label>
              <input
                id="replace-input-field"
                type="text"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="Substituir com..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                id="btn-cancel-search"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition ${
                  theme === 'dark'
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Fechar
              </button>
              <button
                type="button"
                id="btn-action-replace-all"
                onClick={handleReplace}
                disabled={!searchTerm || matchCount === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Replace className="w-4 h-4" />
                <span>Substituir Tudo</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
