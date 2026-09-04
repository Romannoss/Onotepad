import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Check, Volume2, AlertCircle, Play, Square, CornerDownLeft } from 'lucide-react';

interface VoiceTypingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertText: (text: string) => void;
  theme: 'light' | 'dark';
}

export const VoiceTypingModal: React.FC<VoiceTypingModalProps> = ({
  isOpen,
  onClose,
  onInsertText,
  theme,
}) => {
  const isDark = theme === 'dark';
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMsg('O reconhecimento de voz não é suportado pelo seu navegador atual. Recomendamos o Google Chrome para Android.');
    }
  }, []);

  const startListening = () => {
    setErrorMsg(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinal += trans + ' ';
          } else {
            currentInterim += trans;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => prev + currentFinal);
        }
        setInterimText(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMsg('Permissão de microfone negada. Permita o acesso ao microfone nas configurações do navegador.');
        } else if (event.error === 'no-speech') {
          // Normal timeout if user was silent
        } else {
          setErrorMsg(`Erro no microfone: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error('Failed to start recognition:', err);
      setErrorMsg('Não foi possível iniciar o microfone.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Auto-start when modal opens if supported
  useEffect(() => {
    if (isOpen && isSupported) {
      setTranscript('');
      setInterimText('');
      setErrorMsg(null);
      const t = setTimeout(() => {
        startListening();
      }, 200);
      return () => clearTimeout(t);
    } else {
      stopListening();
    }
  }, [isOpen]);

  const handleApply = () => {
    const fullText = (transcript + (interimText ? ' ' + interimText : '')).trim();
    if (fullText) {
      onInsertText(fullText + ' ');
    }
    stopListening();
    onClose();
  };

  const handleAddPunctuation = (symbol: string) => {
    setTranscript((prev) => prev.trim() + symbol + ' ');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            id="voice-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs"
          />

          <motion.div
            id="voice-modal-card"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`fixed inset-x-4 bottom-6 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:w-full sm:max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-600/20 text-emerald-400'}`}>
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Escrever por Voz</h3>
                  <p className="text-xs text-slate-400">
                    {isListening ? 'Ouvindo... Fale com clareza' : 'Ditado por voz (pt-BR)'}
                  </p>
                </div>
              </div>
              <button
                id="close-voice-modal-btn"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-800/60 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner if any */}
            {errorMsg && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Audio visualization wave & Mic button */}
            <div className="my-5 flex flex-col items-center justify-center">
              <div className="relative">
                {isListening && (
                  <div className="absolute -inset-3 rounded-full bg-rose-500/25 animate-ping" />
                )}
                <button
                  id="toggle-listening-btn"
                  onClick={isListening ? stopListening : startListening}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition active:scale-95 ${
                    isListening
                      ? 'bg-rose-600 text-white hover:bg-rose-700 ring-4 ring-rose-500/30'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                  aria-label={isListening ? 'Parar escuta' : 'Iniciar microfone'}
                >
                  {isListening ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
                </button>
              </div>

              <div className="mt-3 text-xs font-medium text-slate-400 flex items-center gap-1.5">
                {isListening ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>Capturando áudio em tempo real...</span>
                  </>
                ) : (
                  <span>Toque no botão para ditar novamente</span>
                )}
              </div>
            </div>

            {/* Transcript Preview Box */}
            <div
              className={`w-full min-h-[100px] max-h-[160px] overflow-y-auto p-3.5 rounded-2xl border text-sm leading-relaxed ${
                isDark
                  ? 'bg-slate-950/70 border-slate-800 text-slate-100'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              {transcript || interimText ? (
                <>
                  <span>{transcript}</span>
                  <span className="text-emerald-400 font-medium italic">{interimText}</span>
                </>
              ) : (
                <span className="text-slate-500 italic text-xs">
                  Sua fala aparecerá aqui conforme você fala...
                </span>
              )}
            </div>

            {/* Quick Punctuation Insert Buttons */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
              <span className="text-[10px] text-slate-400 font-medium shrink-0">Pontuação:</span>
              <button
                type="button"
                onClick={() => handleAddPunctuation(',')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                Vírgula ,
              </button>
              <button
                type="button"
                onClick={() => handleAddPunctuation('.')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                Ponto .
              </button>
              <button
                type="button"
                onClick={() => handleAddPunctuation('?')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                Interrogação ?
              </button>
              <button
                type="button"
                onClick={() => handleAddPunctuation('!')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                Exclamação !
              </button>
              <button
                type="button"
                onClick={() => handleAddPunctuation('\n')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
              >
                <CornerDownLeft className="w-3 h-3" /> Linha
              </button>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setTranscript('');
                  setInterimText('');
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition"
              >
                Limpar
              </button>
              <button
                type="button"
                id="voice-insert-note-btn"
                onClick={handleApply}
                disabled={!(transcript.trim() || interimText.trim())}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold shadow-md active:scale-95 transition"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Inserir na Nota</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
