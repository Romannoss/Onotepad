import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Smartphone,
  Headphones,
  AlertCircle
} from 'lucide-react';
import { htmlToPlainText } from '../utils/fileStorage';

interface GeminiVoiceReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteTitle: string;
  noteContent: string;
  theme: 'light' | 'dark';
}

declare global {
  interface Window {
    AndroidFileBridge?: {
      speakText?: (text: string, rate: number) => void;
      stopSpeech?: () => void;
      isNativeTtsAvailable?: () => boolean;
      [key: string]: any;
    };
    __onNativeSpeechStart?: () => void;
    __onNativeSpeechEnd?: () => void;
    __activeSpeechUtterance?: any;
  }
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

  // Reading states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState<number>(1.0);
  const [readMode, setReadMode] = useState<'original' | 'gemini_narration' | 'gemini_summary'>('original');

  // Prepared texts
  const [geminiNarration, setGeminiNarration] = useState<string>('');
  const [geminiSummary, setGeminiSummary] = useState<string>('');
  const [isLoadingGemini, setIsLoadingGemini] = useState(false);
  const [geminiError, setGeminiError] = useState<string>('');

  // Voices from Web Speech API (fallback when not on native Android)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);

  // Chunking for Web Speech API
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const chunksRef = useRef<string[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const keepAliveTimerRef = useRef<any>(null);

  // Detect Android Native Bridge
  const isNativeBridgeAvailable = useCallback((): boolean => {
    return (
      typeof window !== 'undefined' &&
      Boolean(window.AndroidFileBridge && typeof window.AndroidFileBridge.speakText === 'function')
    );
  }, []);

  // Update voice list for browser
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
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
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Register Native Android TTS callbacks
  useEffect(() => {
    window.__onNativeSpeechStart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      isPlayingRef.current = true;
    };

    window.__onNativeSpeechEnd = () => {
      setIsPlaying(false);
      setIsPaused(false);
      isPlayingRef.current = false;
    };

    return () => {
      delete window.__onNativeSpeechStart;
      delete window.__onNativeSpeechEnd;
    };
  }, []);

  // Stop reading when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopSpeech();
    }
  }, [isOpen]);

  // Clean up keep-alive timer on unmount
  useEffect(() => {
    return () => {
      if (keepAliveTimerRef.current) {
        clearInterval(keepAliveTimerRef.current);
      }
      stopSpeech();
    };
  }, []);

  const stopSpeech = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentChunkIndex(0);

    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }

    // Stop Native Android
    if (isNativeBridgeAvailable()) {
      try {
        window.AndroidFileBridge?.stopSpeech?.();
      } catch (e) {
        console.warn('Error stopping native TTS:', e);
      }
    }

    // Stop Web Speech API
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isNativeBridgeAvailable]);

  // Get active text to read based on mode
  const getActiveText = useCallback((): string => {
    if (readMode === 'gemini_narration' && geminiNarration) {
      return geminiNarration;
    }
    if (readMode === 'gemini_summary' && geminiSummary) {
      return geminiSummary;
    }
    return plainText;
  }, [readMode, geminiNarration, geminiSummary, plainText]);

  // Fetch Gemini processed text
  const fetchGeminiText = async (mode: 'read' | 'summary') => {
    if (isEmpty) return;
    setIsLoadingGemini(true);
    setGeminiError('');

    try {
      const res = await fetch('/api/gemini/read-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: plainText.slice(0, 10000),
          mode,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao processar texto com Gemini.');
      }

      const data = await res.json();
      if (mode === 'read') {
        setGeminiNarration(data.preparedText || plainText);
        setReadMode('gemini_narration');
      } else {
        setGeminiSummary(data.preparedText || plainText);
        setReadMode('gemini_summary');
      }
    } catch (err: any) {
      console.error('Gemini speech error:', err);
      setGeminiError(err.message || 'Erro ao conectar à IA Gemini.');
    } finally {
      setIsLoadingGemini(false);
    }
  };

  // Split text into safe chunks for browsers to avoid 15s freeze
  const chunkText = (text: string): string[] => {
    // Split by punctuation (sentences) or newlines
    const rawChunks = text.split(/(?<=[.!?\n])\s+/);
    const result: string[] = [];
    let temp = '';

    for (const chunk of rawChunks) {
      if ((temp + ' ' + chunk).length > 180) {
        if (temp.trim()) result.push(temp.trim());
        temp = chunk;
      } else {
        temp = temp ? temp + ' ' + chunk : chunk;
      }
    }
    if (temp.trim()) result.push(temp.trim());
    return result.length > 0 ? result : [text];
  };

  // Speak a specific chunk index via Web Speech API
  const speakWebChunk = (chunks: string[], index: number) => {
    if (!isPlayingRef.current || index >= chunks.length) {
      setIsPlaying(false);
      setIsPaused(false);
      isPlayingRef.current = false;
      return;
    }

    setCurrentChunkIndex(index);
    const textChunk = chunks[index];

    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textChunk);
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
      if (isPlayingRef.current) {
        speakWebChunk(chunks, index + 1);
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech chunk error:', e);
      if (isPlayingRef.current) {
        speakWebChunk(chunks, index + 1);
      }
    };

    // Store reference on window to prevent Chrome GC bug
    window.__activeSpeechUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Start reading
  const startSpeech = (textToRead: string, startIndex = 0) => {
    if (!textToRead.trim()) return;

    stopSpeech();
    isPlayingRef.current = true;
    setIsPlaying(true);
    setIsPaused(false);

    // 1. Android Native TTS via Bridge (Bypasses WebView WebSpeech bugs)
    if (isNativeBridgeAvailable()) {
      try {
        window.AndroidFileBridge?.speakText?.(textToRead, rate);
        return;
      } catch (e) {
        console.warn('Failed to call native Android speakText:', e);
      }
    }

    // 2. Web Speech API (Browser Fallback)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const chunks = chunkText(textToRead);
      chunksRef.current = chunks;
      speakWebChunk(chunks, startIndex);

      // Keepalive ticker to prevent Chromium 15s pause bug
      if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);
    }
  };

  const handleTogglePlay = () => {
    if (isEmpty) return;

    if (isPlaying) {
      if (isPaused) {
        // Resume
        if (isNativeBridgeAvailable()) {
          const text = getActiveText();
          startSpeech(text);
        } else if ('speechSynthesis' in window) {
          window.speechSynthesis.resume();
          setIsPaused(false);
        }
      } else {
        // Pause
        if (isNativeBridgeAvailable()) {
          stopSpeech();
          setIsPaused(true);
        } else if ('speechSynthesis' in window) {
          window.speechSynthesis.pause();
          setIsPaused(true);
        }
      }
    } else {
      const text = getActiveText();
      startSpeech(text, isPaused ? currentChunkIndex : 0);
    }
  };

  const handleSpeedChange = (newRate: number) => {
    setRate(newRate);
    if (isPlaying && !isPaused) {
      const text = getActiveText();
      startSpeech(text, currentChunkIndex);
    }
  };

  if (!isOpen) return null;

  const isNative = isNativeBridgeAvailable();
  const currentText = getActiveText();

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
          className="fixed inset-0 bg-black/75 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className={`relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 shrink-0">
                <Volume2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-tight">Leitor de Voz da Nota</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    v4.6
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="truncate max-w-[180px] font-medium">{noteTitle || 'Nota sem título'}</span>
                  <span>•</span>
                  {isNative ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <Smartphone className="w-3 h-3" /> Android Nativo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Headphones className="w-3 h-3" /> Síntese Web
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition active:scale-95"
              aria-label="Fechar leitor de voz"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Audio Wave Visualizer & Status */}
            <div
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-colors ${
                isPlaying && !isPaused
                  ? 'bg-emerald-950/25 border-emerald-500/40 shadow-inner'
                  : isDark
                  ? 'bg-slate-800/40 border-slate-800'
                  : 'bg-slate-100/80 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 h-10">
                {[35, 75, 55, 95, 60, 85, 45, 90, 65, 80, 50, 70].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={
                      isPlaying && !isPaused
                        ? {
                            height: [
                              `${Math.max(15, h * 0.25)}%`,
                              `${Math.min(100, h * 1.15)}%`,
                              `${Math.max(20, h * 0.45)}%`,
                            ],
                          }
                        : { height: '18%' }
                    }
                    transition={{
                      repeat: Infinity,
                      duration: 0.5 + (i % 4) * 0.12,
                      ease: 'easeInOut',
                    }}
                    className={`w-1.5 rounded-full transition-colors ${
                      isPlaying && !isPaused
                        ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50'
                        : isPaused
                        ? 'bg-amber-400/60'
                        : isDark
                        ? 'bg-slate-700'
                        : 'bg-slate-300'
                    }`}
                  />
                ))}
              </div>

              <div className="text-center space-y-0.5">
                <span
                  className={`text-xs font-bold block ${
                    isEmpty
                      ? 'text-slate-500'
                      : isPlaying && !isPaused
                      ? 'text-emerald-400'
                      : isPaused
                      ? 'text-amber-400'
                      : 'text-slate-300'
                  }`}
                >
                  {isEmpty
                    ? 'A nota está vazia'
                    : isPlaying && !isPaused
                    ? 'Lendo nota em voz alta...'
                    : isPaused
                    ? 'Leitura em pausa'
                    : 'Pronto para iniciar leitura'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {readMode === 'original' && 'Texto original da nota'}
                  {readMode === 'gemini_narration' && 'Locução narrada preparada pelo Gemini'}
                  {readMode === 'gemini_summary' && 'Resumo falado em áudio pelo Gemini'}
                </span>
              </div>
            </div>

            {/* Reading Mode Selection (Original / Locução Gemini / Resumo Gemini) */}
            {!isEmpty && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Modo de Leitura:</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Mode 1: Original */}
                  <button
                    onClick={() => {
                      stopSpeech();
                      setReadMode('original');
                    }}
                    className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                      readMode === 'original'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4 mb-1" />
                    <span className="truncate">Texto da Nota</span>
                  </button>

                  {/* Mode 2: Gemini Narration */}
                  <button
                    onClick={() => {
                      stopSpeech();
                      if (!geminiNarration) {
                        fetchGeminiText('read');
                      } else {
                        setReadMode('gemini_narration');
                      }
                    }}
                    disabled={isLoadingGemini}
                    className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                      readMode === 'gemini_narration'
                        ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-950/40'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {isLoadingGemini && readMode !== 'gemini_summary' ? (
                      <Loader2 className="w-4 h-4 mb-1 animate-spin text-teal-300" />
                    ) : (
                      <Sparkles className="w-4 h-4 mb-1 text-teal-400" />
                    )}
                    <span className="truncate">Locução Gemini</span>
                  </button>

                  {/* Mode 3: Gemini Summary */}
                  <button
                    onClick={() => {
                      stopSpeech();
                      if (!geminiSummary) {
                        fetchGeminiText('summary');
                      } else {
                        setReadMode('gemini_summary');
                      }
                    }}
                    disabled={isLoadingGemini}
                    className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                      readMode === 'gemini_summary'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950/40'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {isLoadingGemini && readMode === 'gemini_summary' ? (
                      <Loader2 className="w-4 h-4 mb-1 animate-spin text-amber-300" />
                    ) : (
                      <Sparkles className="w-4 h-4 mb-1 text-amber-300" />
                    )}
                    <span className="truncate">Resumo Gemini</span>
                  </button>
                </div>
              </div>
            )}

            {/* Gemini Error Alert if any */}
            {geminiError && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <p className="flex-1">{geminiError}</p>
              </div>
            )}

            {/* Text Preview Box with Word/Sentence Container */}
            <div
              className={`p-3.5 rounded-2xl border text-xs max-h-36 overflow-y-auto leading-relaxed ${
                isDark
                  ? 'bg-slate-950/70 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              {isEmpty ? (
                <p className="text-slate-500 italic text-center py-4">
                  Esta nota está sem conteúdo. Digite algo no editor para ouvir a leitura.
                </p>
              ) : (
                <p className="whitespace-pre-wrap">{currentText}</p>
              )}
            </div>

            {/* Speed selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Velocidade da Voz:</span>
                <span className="text-emerald-400 font-bold">{rate}x</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => handleSpeedChange(spd)}
                    className={`py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                      rate === spd
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
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

            {/* Voice selection (Browser only) */}
            {!isNative && voices.length > 1 && (
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Voz do Navegador:</label>
                <select
                  value={selectedVoiceIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setSelectedVoiceIndex(idx);
                    if (isPlaying) {
                      const text = getActiveText();
                      startSpeech(text, currentChunkIndex);
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
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={stopSpeech}
              disabled={!isPlaying && !isPaused}
              title="Parar leitura"
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 transition active:scale-95"
            >
              <Square className="w-4 h-4 text-rose-400 fill-rose-400/30" />
              <span>Parar</span>
            </button>

            <button
              onClick={handleTogglePlay}
              disabled={isEmpty}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/50 disabled:opacity-40 transition active:scale-98"
            >
              {isPlaying && !isPaused ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>{isPaused ? 'Continuar Leitura' : 'Ouvir Nota'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
