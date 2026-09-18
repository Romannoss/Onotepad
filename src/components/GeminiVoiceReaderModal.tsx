import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Sparkles,
  ArrowLeft,
  X,
  FileText,
  Loader2,
  Check,
  CheckCircle2,
  Smartphone,
  Headphones,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { htmlToPlainText } from '../utils/fileStorage';
import { apiFetch, prepareOfflineLocucao, prepareOfflineResumo } from '../utils/apiClient';

export interface GeminiVoiceOption {
  id: string; // 'Aoede' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir'
  name: string;
  gender: 'Feminina' | 'Masculina';
  desc: string;
  tone: string;
  pitch: number;
  recommended?: boolean;
}

export const GEMINI_VOICES: GeminiVoiceOption[] = [
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'Feminina',
    desc: 'Suave, expressiva e natural',
    tone: 'Ideal para narrações fluidas e notas longas',
    pitch: 1.1,
    recommended: true,
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Feminina',
    desc: 'Calma, serena e pausada',
    tone: 'Ótima para foco e notas de estudo',
    pitch: 1.0,
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Masculina',
    desc: 'Jovem, clara e dinâmica',
    tone: 'Voz energética e ágil para resumos',
    pitch: 0.95,
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Masculina',
    desc: 'Grave, profunda e ponderada',
    tone: 'Tom formal e assertivo para relatórios',
    pitch: 0.8,
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Masculina',
    desc: 'Firme, confiante e marcante',
    tone: 'Voz marcante para tarefas e lembretes',
    pitch: 0.9,
  },
];

interface GeminiVoiceReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
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
  onBack,
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

  // Gemini Voice Selection
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onotepad_gemini_voice') || 'Aoede';
    }
    return 'Aoede';
  });
  const [isVoiceSelectorOpen, setIsVoiceSelectorOpen] = useState(false);
  const [playingSampleVoice, setPlayingSampleVoice] = useState<string | null>(null);

  // Prepared texts
  const [geminiNarration, setGeminiNarration] = useState<string>('');
  const [geminiSummary, setGeminiSummary] = useState<string>('');
  const [isLoadingGemini, setIsLoadingGemini] = useState(false);
  const [geminiError, setGeminiError] = useState<string>('');
  const [geminiStatusNote, setGeminiStatusNote] = useState<string>('');

  // Audio element for server-generated Gemini neural audio if available
  const [geminiAudioUrl, setGeminiAudioUrl] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Voices from Web Speech API (fallback when not on native Android)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedWebVoiceIndex, setSelectedWebVoiceIndex] = useState<number>(0);

  // Chunking for Web Speech API
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const chunksRef = useRef<string[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const keepAliveTimerRef = useRef<any>(null);

  const activeGeminiVoice = GEMINI_VOICES.find((v) => v.id === selectedVoiceId) || GEMINI_VOICES[0];

  // Save selected voice
  const handleSelectVoice = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onotepad_gemini_voice', voiceId);
    }
  };

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
          setSelectedWebVoiceIndex(ptIndex);
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
    setPlayingSampleVoice(null);

    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }

    // Stop Gemini audio element if playing
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
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

  // Fetch Gemini processed text (Locução or Resumo)
  const fetchGeminiText = async (mode: 'read' | 'summary') => {
    if (isEmpty) return;
    setIsLoadingGemini(true);
    setGeminiError('');
    setGeminiStatusNote('');

    try {
      // Call backend API via apiClient which handles Cloud Run URL resolution on Android
      const data = await apiFetch('/api/gemini/read-note', {
        method: 'POST',
        body: JSON.stringify({
          content: plainText.slice(0, 10000),
          mode,
          voice: selectedVoiceId,
          generateAudio: false,
        }),
      });

      if (mode === 'read') {
        const text = data.preparedText || plainText;
        setGeminiNarration(text);
        setReadMode('gemini_narration');
      } else {
        const text = data.preparedText || plainText;
        setGeminiSummary(text);
        setReadMode('gemini_summary');
      }

      if (data.audioBase64) {
        setGeminiAudioUrl(data.audioBase64);
      }
    } catch (err: any) {
      console.warn('Gemini API call failed, activating smart local fallback:', err);
      // Seamless smart fallback so button NEVER breaks
      if (mode === 'read') {
        const fallbackText = prepareOfflineLocucao(plainText);
        setGeminiNarration(fallbackText);
        setReadMode('gemini_narration');
        setGeminiStatusNote('Texto adaptado localmente para locução (modo sem conexão).');
      } else {
        const fallbackSummary = prepareOfflineResumo(plainText);
        setGeminiSummary(fallbackSummary);
        setReadMode('gemini_summary');
        setGeminiStatusNote('Resumo preparado localmente para leitura.');
      }
    } finally {
      setIsLoadingGemini(false);
    }
  };

  // Play sample of a Gemini voice
  const handlePlayVoiceSample = (voice: GeminiVoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();
    stopSpeech();
    setPlayingSampleVoice(voice.id);

    const sampleText = `Olá! Esta é a voz ${voice.name} do Gemini, configurada para leitura de suas anotações.`;

    if (isNativeBridgeAvailable()) {
      try {
        window.AndroidFileBridge?.speakText?.(sampleText, 1.0);
        setTimeout(() => setPlayingSampleVoice(null), 3500);
        return;
      } catch (err) {
        console.warn('Native sample speech error:', err);
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      utterance.pitch = voice.pitch;

      // Select matching voice in browser if available
      if (voices.length > 0) {
        const isFemale = voice.gender === 'Feminina';
        const match = voices.find((v) => {
          const nameLower = v.name.toLowerCase();
          const lang = v.lang.toLowerCase();
          const isPt = lang.includes('pt');
          if (!isPt) return false;
          if (isFemale) {
            return nameLower.includes('female') || nameLower.includes('luciana') || nameLower.includes('maria') || nameLower.includes('francisca');
          }
          return nameLower.includes('male') || nameLower.includes('jorge') || nameLower.includes('felipe');
        });
        if (match) {
          utterance.voice = match;
        } else if (voices[selectedWebVoiceIndex]) {
          utterance.voice = voices[selectedWebVoiceIndex];
        }
      }

      utterance.onend = () => setPlayingSampleVoice(null);
      utterance.onerror = () => setPlayingSampleVoice(null);
      window.__activeSpeechUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Split text into safe chunks for browsers to avoid 15s freeze
  const chunkText = (text: string): string[] => {
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
    utterance.pitch = activeGeminiVoice.pitch;

    if (voices[selectedWebVoiceIndex]) {
      utterance.voice = voices[selectedWebVoiceIndex];
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

    // Store reference on window to prevent Chromium GC bug
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

    // 1. If we have Gemini generated audio, play it directly
    if (geminiAudioUrl && audioPlayerRef.current) {
      audioPlayerRef.current.src = geminiAudioUrl;
      audioPlayerRef.current.playbackRate = rate;
      audioPlayerRef.current.play().catch((err) => {
        console.warn('Gemini audio playback error, falling back to TTS:', err);
      });
      return;
    }

    // 2. Android Native TTS via Bridge
    if (isNativeBridgeAvailable()) {
      try {
        window.AndroidFileBridge?.speakText?.(textToRead, rate);
        return;
      } catch (e) {
        console.warn('Failed to call native Android speakText:', e);
      }
    }

    // 3. Web Speech API (Browser Fallback)
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
        if (audioPlayerRef.current && geminiAudioUrl) {
          audioPlayerRef.current.play();
          setIsPaused(false);
        } else if (isNativeBridgeAvailable()) {
          const text = getActiveText();
          startSpeech(text);
        } else if ('speechSynthesis' in window) {
          window.speechSynthesis.resume();
          setIsPaused(false);
        }
      } else {
        // Pause
        if (audioPlayerRef.current && geminiAudioUrl) {
          audioPlayerRef.current.pause();
          setIsPaused(true);
        } else if (isNativeBridgeAvailable()) {
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
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = newRate;
    }
    if (isPlaying && !isPaused) {
      const text = getActiveText();
      startSpeech(text, currentChunkIndex);
    }
  };

  // Back button handler to return to the main hamburger menu
  const handleBack = () => {
    stopSpeech();
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  // Close handler for the "X" button (closes directly to editor)
  const handleClose = () => {
    stopSpeech();
    onClose();
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
          onClick={handleBack}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs"
        />

        {/* Hidden Audio Player for neural Gemini Audio */}
        <audio
          ref={audioPlayerRef}
          onEnded={() => {
            setIsPlaying(false);
            setIsPaused(false);
            isPlayingRef.current = false;
          }}
          className="hidden"
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
          {/* Header with Back Arrow Button */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Back Button with Arrow icon returning to Hamburger Menu */}
              <button
                id="btn-voltar-leitor-voz"
                onClick={handleBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition active:scale-95 text-xs font-bold shrink-0 shadow-xs cursor-pointer"
                title="Voltar à página principal do menu hambúrguer"
                aria-label="Voltar para a página principal do menu hambúrguer"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                <span className="hidden xs:inline sm:inline">Voltar</span>
              </button>

              <div className="w-9 h-9 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 shrink-0">
                <Volume2 className="w-5 h-5 stroke-[2.2]" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base tracking-tight">Leitor de Voz</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    v4.7.1
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400">
                  <span className="truncate max-w-[130px] sm:max-w-[170px] font-medium">
                    {noteTitle || 'Nota sem título'}
                  </span>
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
              id="close-gemini-voice-reader-btn"
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition active:scale-95 cursor-pointer"
              aria-label="Fechar leitor de voz"
              title="Fechar leitor de voz"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
            {/* Audio Wave Visualizer & Status */}
            <div
              className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2.5 transition-colors ${
                isPlaying && !isPaused
                  ? 'bg-emerald-950/25 border-emerald-500/40 shadow-inner'
                  : isDark
                  ? 'bg-slate-800/40 border-slate-800'
                  : 'bg-slate-100/80 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 h-8 sm:h-9">
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
                <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <span>
                    {readMode === 'original' && 'Texto original da nota'}
                    {readMode === 'gemini_narration' && 'Locução narrada adaptada com Gemini'}
                    {readMode === 'gemini_summary' && 'Resumo falado em áudio pelo Gemini'}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">Voz {activeGeminiVoice.name}</span>
                </span>
              </div>
            </div>

            {/* Reading Mode Selection Buttons */}
            {!isEmpty && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Modo de Leitura:</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Mode 1: Original */}
                  <button
                    id="btn-modo-texto-nota"
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
                    id="btn-modo-locucao-gemini"
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
                    id="btn-modo-resumo-gemini"
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

            {/* Gemini Voice Selection Button & Dropdown */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Escolha a Voz do Gemini:</span>
                </span>
                <span className="text-[11px] text-emerald-400 font-bold">
                  {activeGeminiVoice.name} ({activeGeminiVoice.gender})
                </span>
              </div>

              {/* Toggle Voice Selector Button */}
              <button
                id="btn-selecionar-voz-gemini"
                type="button"
                onClick={() => setIsVoiceSelectorOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold transition active:scale-98 ${
                  isVoiceSelectorOpen
                    ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-300'
                    : isDark
                    ? 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-700/60'
                    : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {activeGeminiVoice.gender === 'Feminina' ? '♀' : '♂'}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">{activeGeminiVoice.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300">
                        {activeGeminiVoice.gender}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block font-normal truncate max-w-[230px] sm:max-w-[280px]">
                      {activeGeminiVoice.desc}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 hidden xs:inline">Alterar voz</span>
                  {isVoiceSelectorOpen ? (
                    <ChevronUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expandable Voice Selection Cards */}
              <AnimatePresence>
                {isVoiceSelectorOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1.5 pt-1 overflow-hidden"
                  >
                    {GEMINI_VOICES.map((v) => {
                      const isSelected = v.id === selectedVoiceId;
                      const isSamplePlaying = playingSampleVoice === v.id;

                      return (
                        <div
                          key={v.id}
                          onClick={() => {
                            handleSelectVoice(v.id);
                            setIsVoiceSelectorOpen(false);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-2xl border cursor-pointer transition active:scale-98 ${
                            isSelected
                              ? 'bg-emerald-950/30 border-emerald-500/70 text-emerald-200 shadow-xs'
                              : isDark
                              ? 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-500 text-white'
                                  : isDark
                                  ? 'bg-slate-700 text-slate-300'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {v.gender === 'Feminina' ? '♀' : '♂'}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs">{v.name}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-700/80 text-slate-300 font-medium">
                                  {v.gender}
                                </span>
                                {v.recommended && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                                    Padrão
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">{v.desc}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Sample Voice Button */}
                            <button
                              type="button"
                              onClick={(e) => handlePlayVoiceSample(v, e)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition active:scale-95 ${
                                isSamplePlaying
                                  ? 'bg-emerald-500 text-white border-emerald-400'
                                  : isDark
                                  ? 'bg-slate-700/80 hover:bg-slate-600 text-slate-300 border-slate-600'
                                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                              }`}
                              title={`Ouvir amostra da voz ${v.name}`}
                            >
                              <Volume2 className={`w-3.5 h-3.5 ${isSamplePlaying ? 'animate-pulse' : ''}`} />
                              <span>{isSamplePlaying ? 'Falando...' : 'Amostra'}</span>
                            </button>

                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Gemini Error Alert if any */}
            {geminiError && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <p className="flex-1">{geminiError}</p>
              </div>
            )}

            {/* Offline status notification if active */}
            {geminiStatusNote && (
              <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <p className="flex-1">{geminiStatusNote}</p>
              </div>
            )}

            {/* Text Preview Box */}
            <div
              className={`p-3 rounded-2xl border text-xs max-h-32 overflow-y-auto leading-relaxed ${
                isDark
                  ? 'bg-slate-950/70 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              {isEmpty ? (
                <p className="text-slate-500 italic text-center py-3">
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

            {/* Voice selection (Browser fallback only) */}
            {!isNative && voices.length > 1 && (
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Voz do Navegador (Web):</label>
                <select
                  value={selectedWebVoiceIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setSelectedWebVoiceIndex(idx);
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
          <div className="p-3.5 sm:p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
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
