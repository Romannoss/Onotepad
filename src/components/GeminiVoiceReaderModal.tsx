import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Sparkles,
  RotateCcw,
  X,
  FileText,
  Loader2,
  CheckCircle2,
  Sliders,
  Radio
} from 'lucide-react';
import { htmlToPlainText } from '../utils/fileStorage';

interface GeminiVoiceReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteTitle: string;
  noteContent: string;
  theme: 'light' | 'dark';
}

export const GeminiVoiceReaderModal: React.FC<GeminiVoiceReaderModalProps> = ({
  isOpen,
  onClose,
  noteTitle,
  noteContent,
  theme,
}) => {
  const isDark = theme === 'dark';
  const plainText = htmlToPlainText(noteContent).trim();
  const isEmpty = plainText.length === 0;

  // Reading state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState<number>(1.0);
  const [readMode, setReadMode] = useState<'full' | 'gemini_summary'>('full');
  
  // Gemini AI summary state
  const [geminiSummary, setGeminiSummary] = useState<string>('');
  const [isLoadingGemini, setIsLoadingGemini] = useState(false);
  const [geminiError, setGeminiError] = useState<string>('');

  // Voices from Web Speech API
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Synthesis & Load Voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
        // Prefer Portuguese voices (pt-BR or pt)
        const ptIndex = available.findIndex(
          (v) => v.lang.toLowerCase().includes('pt-br') || v.lang.toLowerCase().includes('pt')
        );
        if (ptIndex !== -1) {
          setSelectedVoiceIndex(ptIndex);
        }
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Stop reading when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopSpeech();
    }
  }, [isOpen]);

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleFetchGeminiSummary = async () => {
    if (isEmpty) return;
    setIsLoadingGemini(true);
    setGeminiError('');

    try {
      const res = await fetch('/api/gemini/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Crie um resumo falado em português brasileiro, em tom agradável e natural de 2 a 3 frases, perfeito para ser lido em voz alta.',
          context: plainText.slice(0, 4000),
          mode: 'summarize',
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao gerar o resumo do Gemini.');
      }

      const data = await res.json();
      const text = data.result || '';
      setGeminiSummary(text);
      setReadMode('gemini_summary');
    } catch (err: any) {
      console.error(err);
      setGeminiError(err.message || 'Erro ao conectar ao Gemini.');
    } finally {
      setIsLoadingGemini(false);
    }
  };

  const startSpeech = (textToRead: string) => {
    if (!textToRead.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = rate;
    utterance.lang = 'pt-BR';

    if (voices[selectedVoiceIndex]) {
      utterance.voice = voices[selectedVoiceIndex];
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleTogglePlay = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPlaying) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    } else {
      const text = readMode === 'gemini_summary' && geminiSummary ? geminiSummary : plainText;
      startSpeech(text);
    }
  };

  const handleSpeedChange = (newRate: number) => {
    setRate(newRate);
    if (isPlaying && !isPaused) {
      // Restart with new speed
      const text = readMode === 'gemini_summary' && geminiSummary ? geminiSummary : plainText;
      startSpeech(text);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            stopSpeech();
            onClose();
          }}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className={`relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
                <Volume2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-tight">Leitor de Voz Gemini</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    v4.3
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate max-w-[200px]">
                  {noteTitle} • {plainText.length} caracteres
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              className="p-2 rounded-full hover:bg-slate-800/80 text-slate-400 hover:text-white transition"
              aria-label="Fechar leitor de voz"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Audio Wave Visualizer while playing */}
            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-colors ${
              isPlaying && !isPaused
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : isDark
                ? 'bg-slate-800/50 border-slate-800'
                : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-1.5 h-10">
                {[40, 75, 55, 95, 60, 85, 45, 90, 65, 80].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={
                      isPlaying && !isPaused
                        ? {
                            height: [
                              `${Math.max(15, h * 0.3)}%`,
                              `${Math.min(100, h * 1.1)}%`,
                              `${Math.max(20, h * 0.5)}%`,
                            ],
                          }
                        : { height: '20%' }
                    }
                    transition={{
                      repeat: Infinity,
                      duration: 0.6 + (i % 3) * 0.15,
                      ease: 'easeInOut',
                    }}
                    className={`w-1.5 rounded-full transition-colors ${
                      isPlaying && !isPaused
                        ? 'bg-emerald-400'
                        : isPaused
                        ? 'bg-amber-400/60'
                        : isDark
                        ? 'bg-slate-700'
                        : 'bg-slate-300'
                    }`}
                  />
                ))}
              </div>

              <div className="text-center">
                <span className={`text-xs font-semibold ${
                  isPlaying && !isPaused
                    ? 'text-emerald-400'
                    : isPaused
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }`}>
                  {isEmpty
                    ? 'A nota está vazia'
                    : isPlaying && !isPaused
                    ? 'Lendo nota em voz alta...'
                    : isPaused
                    ? 'Leitura pausada'
                    : 'Pronto para iniciar leitura'}
                </span>
              </div>
            </div>

            {/* Mode selection tabs */}
            {!isEmpty && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    stopSpeech();
                    setReadMode('full');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition ${
                    readMode === 'full'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Texto Completo</span>
                </button>

                <button
                  onClick={() => {
                    stopSpeech();
                    if (!geminiSummary) {
                      handleFetchGeminiSummary();
                    } else {
                      setReadMode('gemini_summary');
                    }
                  }}
                  disabled={isLoadingGemini}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition ${
                    readMode === 'gemini_summary'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {isLoadingGemini ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>Resumo Gemini</span>
                </button>
              </div>
            )}

            {/* Gemini summary display if selected */}
            {readMode === 'gemini_summary' && geminiSummary && (
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
                <div className="flex items-center gap-1.5 mb-1 text-indigo-300 font-semibold text-[11px]">
                  <Sparkles className="w-3 h-3" />
                  <span>Resumo gerado para leitura:</span>
                </div>
                <p>{geminiSummary}</p>
              </div>
            )}

            {/* Text Preview */}
            <div className={`p-3 rounded-xl border text-xs max-h-32 overflow-y-auto ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              {isEmpty ? (
                <p className="text-slate-500 italic text-center py-2">
                  Escreva algum conteúdo nesta nota para que o Gemini possa ler.
                </p>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {readMode === 'gemini_summary' && geminiSummary ? geminiSummary : plainText}
                </p>
              )}
            </div>

            {/* Speed selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Velocidade de Fala:</span>
                <span className="text-emerald-400 font-bold">{rate}x</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => handleSpeedChange(spd)}
                    className={`py-1 rounded-lg text-xs font-semibold border transition active:scale-95 ${
                      rate === spd
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Voice selection if multiple voices found */}
            {voices.length > 1 && (
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Voz:</label>
                <select
                  value={selectedVoiceIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setSelectedVoiceIndex(idx);
                    if (isPlaying) {
                      const text = readMode === 'gemini_summary' && geminiSummary ? geminiSummary : plainText;
                      startSpeech(text);
                    }
                  }}
                  className={`w-full text-xs rounded-xl px-2.5 py-1.5 border outline-none ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-200'
                      : 'bg-slate-100 border-slate-300 text-slate-800'
                  }`}
                >
                  {voices.map((v, i) => (
                    <option key={i} value={i}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={stopSpeech}
              disabled={!isPlaying && !isPaused}
              title="Parar leitura"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition active:scale-95"
            >
              <Square className="w-4 h-4 text-rose-400 fill-rose-400/30" />
              <span>Parar</span>
            </button>

            <button
              onClick={handleTogglePlay}
              disabled={isEmpty}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/50 disabled:opacity-40 transition active:scale-98"
            >
              {isPlaying && !isPaused ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>{isPaused ? 'Continuar' : 'Ouvir Nota'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
