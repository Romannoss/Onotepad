import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Image as ImageIcon,
  Upload,
  Camera,
  Link,
  Trash2,
  Download,
  X,
  Plus,
  Maximize2,
  FileDown,
  Check,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { NoteImage } from '../types';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: NoteImage[];
  onAddImage: (image: NoteImage) => void;
  onRemoveImage: (imageId: string) => void;
  onInsertImageIntoDocument: (dataUrl: string, name?: string) => void;
  theme: 'light' | 'dark';
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  images = [],
  onAddImage,
  onRemoveImage,
  onInsertImageIntoDocument,
  theme,
}) => {
  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<NoteImage | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Convert File to Base64 and insert directly into document
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('O arquivo selecionado não é uma imagem válida.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('A imagem é muito grande. Escolha uma imagem de até 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        const imageName = file.name.replace(/\.[^/.]+$/, '') || 'imagem';
        const newImage: NoteImage = {
          id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: imageName,
          dataUrl,
          createdAt: Date.now(),
        };
        onAddImage(newImage);
        onInsertImageIntoDocument(dataUrl, imageName);
        setErrorMsg(null);
        onClose();
      }
    };
    reader.onerror = () => {
      setErrorMsg('Erro ao carregar o arquivo de imagem.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
    if (e.target) e.target.value = '';
  };

  const handleAddUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) {
      setErrorMsg('Insira um link de imagem válido iniciando com https://');
      return;
    }

    const newImage: NoteImage = {
      id: 'img-' + Date.now(),
      name: 'Imagem da Web',
      dataUrl: url,
      createdAt: Date.now(),
    };

    onAddImage(newImage);
    onInsertImageIntoDocument(url, 'Imagem da Web');
    setImageUrlInput('');
    setErrorMsg(null);
    onClose();
  };

  const handleDownload = (img: NoteImage) => {
    const a = document.createElement('a');
    a.href = img.dataUrl;
    a.download = `${img.name || 'imagem'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleInsertDirect = (img: NoteImage) => {
    onInsertImageIntoDocument(img.dataUrl, img.name);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            id="image-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs"
          />

          <motion.div
            id="image-modal-card"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`fixed inset-x-3 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:w-full sm:max-w-xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Hidden native inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-700/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-pink-500 text-white shadow-md shadow-pink-950/40">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Inserir Imagem na Nota</h3>
                  <p className="text-xs text-slate-400">
                    A imagem é inserida diretamente junto com o texto
                  </p>
                </div>
              </div>
              <button
                id="close-image-modal-btn"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-800/60 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Error message */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Upload actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  id="btn-upload-device-image"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 hover:bg-indigo-600/25 active:scale-98 transition text-left group"
                >
                  <div className="p-2 rounded-xl bg-indigo-500 text-white shrink-0 shadow-sm">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-indigo-200">Galeria / Arquivo</div>
                    <div className="text-[10px] text-indigo-400/80">Inserir direto no texto</div>
                  </div>
                </button>

                <button
                  type="button"
                  id="btn-camera-capture-image"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600/25 active:scale-98 transition text-left group"
                >
                  <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0 shadow-sm">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-emerald-200">Tirar Foto</div>
                    <div className="text-[10px] text-emerald-400/80">Câmera do aparelho</div>
                  </div>
                </button>
              </div>

              {/* URL Input */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Ou link de imagem na internet (https://...)"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-hidden ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddUrl}
                  disabled={!imageUrlInput.trim()}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-medium border border-slate-700 transition shrink-0"
                >
                  Inserir
                </button>
              </div>

              {/* Images History / Attached */}
              {images.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    Imagens Salvas Nesta Nota ({images.length})
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className={`group relative rounded-2xl overflow-hidden border transition ${
                          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div
                          onClick={() => setSelectedPreviewImage(img)}
                          className="w-full h-24 overflow-hidden bg-slate-900 cursor-pointer flex items-center justify-center"
                        >
                          <img
                            src={img.dataUrl}
                            alt={img.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>

                        {/* Title & Actions */}
                        <div className="p-2">
                          <div className="text-xs font-semibold truncate" title={img.name}>
                            {img.name}
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-1.5 pt-1 border-t border-slate-800/60">
                            <button
                              type="button"
                              onClick={() => handleInsertDirect(img)}
                              title="Inserir novamente no texto"
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-medium transition"
                            >
                              <ArrowRight className="w-3 h-3" />
                              <span>Inserir</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(img)}
                              title="Baixar imagem"
                              className="p-1 rounded-md hover:bg-sky-500/20 text-sky-400 transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveImage(img.id)}
                              title="Excluir imagem"
                              className="p-1 rounded-md hover:bg-rose-500/20 text-rose-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400 bg-slate-900/50 rounded-b-3xl shrink-0">
              <span className="text-[11px]">Dica: Você também pode colar imagens com Ctrl+V</span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Fechar
              </button>
            </div>
          </motion.div>

          {/* Full-screen Zoom Modal */}
          {selectedPreviewImage && (
            <div
              onClick={() => setSelectedPreviewImage(null)}
              className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md"
            >
              <button
                onClick={() => setSelectedPreviewImage(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={selectedPreviewImage.dataUrl}
                alt={selectedPreviewImage.name}
                referrerPolicy="no-referrer"
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
              />
              <div className="mt-3 text-sm text-slate-200 font-medium">
                {selectedPreviewImage.name}
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};
