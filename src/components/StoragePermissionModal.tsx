import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  HardDrive,
  ShieldCheck,
  FileText,
  Save,
  CheckCircle2,
  X,
  Sparkles,
  Volume2
} from 'lucide-react';

interface StoragePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onPermissionGranted?: () => void;
}

export const StoragePermissionModal: React.FC<StoragePermissionModalProps> = ({
  isOpen,
  onClose,
  theme,
  onPermissionGranted,
}) => {
  const isDark = theme === 'dark';

  const handleGrantPermission = async () => {
    try {
      // 1. Mark in localStorage for v4.5 so it does not ask again on next app launches
      localStorage.setItem('onotepad_permissions_v4_5', 'granted');
      localStorage.setItem('onotepad_storage_permission_v4_5', 'granted');
      localStorage.setItem('onotepad_microphone_permission_v4_5', 'granted');

      // 2. Trigger native Android OS storage & microphone permissions dialog via bridge
      const androidBridge = (
        window as unknown as {
          AndroidFileBridge?: {
            requestStoragePermission?: () => void;
            requestMicrophonePermission?: () => void;
            requestAllAppPermissions?: () => void;
            hasStoragePermission?: () => boolean;
            hasMicrophonePermission?: () => boolean;
          };
        }
      ).AndroidFileBridge;

      if (androidBridge) {
        if (typeof androidBridge.requestAllAppPermissions === 'function') {
          androidBridge.requestAllAppPermissions();
        } else {
          if (typeof androidBridge.requestStoragePermission === 'function') {
            androidBridge.requestStoragePermission();
          }
          if (typeof androidBridge.requestMicrophonePermission === 'function') {
            androidBridge.requestMicrophonePermission();
          }
        }
      }

      // 3. Request browser / WebView microphone permission prompt if available
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (mediaErr) {
          console.warn('Web mediaDevices prompt notice:', mediaErr);
        }
      }
    } catch (e) {
      console.warn('Permission trigger:', e);
    }

    if (onPermissionGranted) {
      onPermissionGranted();
    }
    onClose();
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('onotepad_permissions_v4_5', 'dismissed');
      localStorage.setItem('onotepad_storage_permission_v4_5', 'dismissed');
      localStorage.setItem('onotepad_microphone_permission_v4_5', 'dismissed');
    } catch (e) {
      console.warn('Permission dismiss:', e);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl border z-10 overflow-hidden ${
              isDark
                ? 'bg-slate-900 border-slate-700/70 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Ambient emerald gradient accent at top */}
            <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between relative">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                  <HardDrive className="w-6 h-6 stroke-[2.2]" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
                    <Mic className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight">Permissões do Aparelho</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      v4.5
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">1. Armazenamento • 2. Microfone</p>
                </div>
              </div>

              <button
                id="btn-close-storage-modal"
                onClick={handleDismiss}
                className="p-2 rounded-full hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Explanation */}
            <div className="mt-4 space-y-3">
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Para a melhor experiência no <strong className="text-emerald-400">Onotepad</strong>, solicitamos duas permissões no seu aparelho:
              </p>

              {/* Feature Points - Two main permissions */}
              <div className="space-y-2.5 pt-1">
                {/* 1. Permissão de Armazenamento & Google Drive */}
                <div
                  className={`flex items-start gap-3 p-3 rounded-2xl border text-xs ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/30">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-100 text-xs">1. Armazenamento & Arquivos</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">Drive & Memória</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Abre e edita notas salvas no celular, Google Drive, WhatsApp ou Downloads, e salva seus arquivos <code className="px-1 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-400">.txt</code> com segurança.
                    </p>
                  </div>
                </div>

                {/* 2. Permissão de Microfone */}
                <div
                  className={`flex items-start gap-3 p-3 rounded-2xl border text-xs ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5 border border-rose-500/30">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-100 text-xs">2. Microfone (Ditado por Voz)</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">Fala em pt-BR</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Permite ditar anotações diretamente pela fala com reconhecimento de voz automático em português e leitura das notas.
                    </p>
                  </div>
                </div>

                {/* Privacidade */}
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs ${
                    isDark
                      ? 'bg-slate-800/40 border-slate-700/40 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    <strong className="text-slate-200">100% Privado:</strong> Suas notas ficam salvas exclusivamente no seu aparelho.
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-col gap-2">
              <button
                id="btn-grant-storage-permission"
                onClick={handleGrantPermission}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-950/40 transition active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Permitir Armazenamento e Microfone</span>
              </button>

              <button
                id="btn-dismiss-storage-permission"
                onClick={handleDismiss}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-medium text-center transition ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                Agora não, continuar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

