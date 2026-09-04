import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect, useCallback } from 'react';
import { NoteTab, AppSettings, NoteImage } from '../types';
import { textToEditorHtml } from '../utils/fileStorage';
import {
  Check,
  Maximize2,
  Trash2,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ZoomIn,
  X,
  Sparkles
} from 'lucide-react';

export interface EditorHandle {
  applyFormatting: (type: 'bold' | 'italic' | 'underline' | 'list' | 'timestamp') => void;
  applyHighlight: (color: string) => boolean;
  applyFontColor: (color: string) => void;
  insertText: (text: string) => void;
  insertImage: (dataUrl: string, name?: string) => void;
  focus: () => void;
}

interface EditorProps {
  note: NoteTab;
  settings: AppSettings;
  onChangeContent: (content: string) => void;
  onFileDrop: (file: File) => void;
  onAddImage?: (image: NoteImage) => void;
  onOpenImageModal?: () => void;
  isSaving: boolean;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(
  ({ note, settings, onChangeContent, onFileDrop, onAddImage, onOpenImageModal, isSaving }, ref) => {
    const editorDivRef = useRef<HTMLDivElement>(null);
    const lastHtmlRef = useRef<string>(note.content || '');
    const savedRangeRef = useRef<Range | null>(null);

    const isDark = settings.theme === 'dark';

    // State for image interaction toolbar inside editor
    const [selectedImageEl, setSelectedImageEl] = useState<HTMLImageElement | null>(null);
    const [imageToolbarPos, setImageToolbarPos] = useState<{ top: number; left: number } | null>(null);
    const [zoomImageSrc, setZoomImageSrc] = useState<{ src: string; alt: string } | null>(null);

    // Save active text selection/range when user types, clicks or touches inside editor
    const saveSelection = useCallback(() => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editorDivRef.current && editorDivRef.current.contains(range.commonAncestorContainer)) {
          savedRangeRef.current = range.cloneRange();
        }
      }
    }, []);

    // Restore text selection/range before executing formatting commands
    const restoreSelection = useCallback(() => {
      if (savedRangeRef.current) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(savedRangeRef.current);
        }
      }
    }, []);

    // Sync editor content with note prop when switching tabs or external update
    useEffect(() => {
      if (editorDivRef.current && note.content !== lastHtmlRef.current) {
        const formatted = note.content ? textToEditorHtml(note.content) : '<p><br></p>';
        editorDivRef.current.innerHTML = formatted;
        lastHtmlRef.current = note.content || '';
      }
    }, [note.id]);

    // Initial mount setup
    useEffect(() => {
      if (editorDivRef.current) {
        if (!editorDivRef.current.innerHTML || editorDivRef.current.innerHTML === '<br>') {
          const formatted = note.content ? textToEditorHtml(note.content) : '<p><br></p>';
          editorDivRef.current.innerHTML = formatted;
          lastHtmlRef.current = note.content || '';
        }
      }
    }, []);

    // Dispatch content change when user types
    const handleInput = useCallback(() => {
      if (editorDivRef.current) {
        const html = editorDivRef.current.innerHTML;
        lastHtmlRef.current = html;
        onChangeContent(html);
        saveSelection();
      }
    }, [onChangeContent, saveSelection]);

    // Apply formatting to selection
    useImperativeHandle(ref, () => ({
      applyFormatting: (type) => {
        if (editorDivRef.current) {
          editorDivRef.current.focus();
        }
        restoreSelection();

        switch (type) {
          case 'bold':
            document.execCommand('bold', false);
            break;
          case 'italic':
            document.execCommand('italic', false);
            break;
          case 'underline':
            document.execCommand('underline', false);
            break;
          case 'list':
            document.execCommand('insertUnorderedList', false);
            break;
          case 'timestamp': {
            const now = new Date();
            const timeStr = `[${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] `;
            document.execCommand('insertText', false, timeStr);
            break;
          }
        }
        handleInput();
      },

      applyHighlight: (color: string): boolean => {
        if (editorDivRef.current) {
          editorDivRef.current.focus();
        }
        restoreSelection();

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !editorDivRef.current) {
          return false;
        }

        const range = sel.getRangeAt(0);

        // Helper to check if an element has a highlight background or mark tag
        const isHighlightElement = (el: HTMLElement): boolean => {
          const tagName = el.tagName.toLowerCase();
          const bg = el.style.backgroundColor || el.style.background || '';
          const hasBg = Boolean(
            bg &&
            bg !== 'transparent' &&
            bg !== 'inherit' &&
            bg !== 'initial' &&
            !bg.includes('rgba(0, 0, 0, 0)')
          );
          return tagName === 'mark' || el.getAttribute('data-highlight') === 'true' || hasBg;
        };

        // Helper to find closest highlight ancestor up to editor root
        const findHighlightAncestor = (node: Node | null): HTMLElement | null => {
          let curr: Node | null = node;
          while (curr && curr !== editorDivRef.current) {
            if (curr.nodeType === Node.ELEMENT_NODE) {
              const el = curr as HTMLElement;
              if (isHighlightElement(el)) {
                return el;
              }
            }
            curr = curr.parentNode;
          }
          return null;
        };

        // Helper to unwrap an element completely
        const unwrap = (el: HTMLElement) => {
          const parent = el.parentNode;
          if (!parent) return;
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
        };

        // Helper to strip highlight styles from an element
        const stripHighlightStyle = (el: HTMLElement) => {
          el.style.backgroundColor = '';
          el.style.removeProperty('background-color');
          el.style.removeProperty('background');
          el.style.removeProperty('color');
          el.style.removeProperty('padding');
          el.style.removeProperty('border-radius');
          el.removeAttribute('data-highlight');
        };

        // Case A: Selection is collapsed (cursor at a single point)
        if (range.collapsed) {
          const highlightParent = findHighlightAncestor(range.startContainer);
          if (highlightParent) {
            // Unmark the highlight container around the cursor
            unwrap(highlightParent);
            handleInput();
            return false; // Unmarked
          } else {
            // Try to select word at cursor and highlight it
            try {
              sel.modify('move', 'backward', 'word');
              sel.modify('extend', 'forward', 'word');
              if (!sel.isCollapsed) {
                const wordRange = sel.getRangeAt(0);
                const wordHighlight = findHighlightAncestor(wordRange.startContainer);
                if (wordHighlight) {
                  unwrap(wordHighlight);
                  handleInput();
                  return false;
                }
                const content = wordRange.extractContents();
                const span = document.createElement('span');
                span.setAttribute('data-highlight', 'true');
                span.style.backgroundColor = color;
                span.style.color = '#1e293b';
                span.style.padding = '2px 4px';
                span.style.borderRadius = '4px';
                span.appendChild(content);
                wordRange.insertNode(span);
                wordRange.selectNode(span);
                sel.removeAllRanges();
                sel.addRange(wordRange);
                handleInput();
                return true; // Marked
              }
            } catch {
              // Fallback
            }
            document.execCommand('hiliteColor', false, color);
            handleInput();
            return true; // Marked
          }
        }

        // Case B: Selection is not collapsed (user selected a range of text)
        // Check if selection is already inside or intersects a highlight
        const commonHighlight = findHighlightAncestor(range.commonAncestorContainer);
        const startHighlight = findHighlightAncestor(range.startContainer);
        const endHighlight = findHighlightAncestor(range.endContainer);

        const allHighlightsInEditor = Array.from(
          editorDivRef.current.querySelectorAll('mark, [data-highlight="true"], span')
        ).filter((el) => isHighlightElement(el as HTMLElement));

        const intersectingHighlights = allHighlightsInEditor.filter((el) => {
          try {
            return range.intersectsNode(el);
          } catch {
            return false;
          }
        });

        const isAlreadyMarked = Boolean(
          commonHighlight ||
          startHighlight ||
          endHighlight ||
          intersectingHighlights.length > 0
        );

        if (isAlreadyMarked) {
          // ==================== DESMARCAR (UNMARK) ====================
          if (commonHighlight) {
            const highlightText = commonHighlight.textContent || '';
            const selectedText = range.toString();

            if (highlightText.trim() === selectedText.trim() || highlightText === selectedText) {
              unwrap(commonHighlight);
            } else {
              // Partial unhighlight inside commonHighlight:
              // Split into before, middle (unmarked), and after
              const beforeRange = document.createRange();
              beforeRange.setStart(commonHighlight, 0);
              beforeRange.setEnd(range.startContainer, range.startOffset);
              const beforeFrag = beforeRange.cloneContents();

              const afterRange = document.createRange();
              afterRange.setStart(range.endContainer, range.endOffset);
              afterRange.setEnd(commonHighlight, commonHighlight.childNodes.length);
              const afterFrag = afterRange.cloneContents();

              const middleFrag = range.extractContents();
              // Clean up any inner highlight elements in middle
              const innerMarks = middleFrag.querySelectorAll('mark, [data-highlight="true"], span');
              innerMarks.forEach((m) => {
                const el = m as HTMLElement;
                if (isHighlightElement(el)) {
                  stripHighlightStyle(el);
                  if (el.tagName.toLowerCase() === 'mark') unwrap(el);
                }
              });

              const parent = commonHighlight.parentNode;
              if (parent) {
                const frag = document.createDocumentFragment();

                if (beforeFrag.textContent && beforeFrag.textContent.length > 0) {
                  const beforeEl = commonHighlight.cloneNode(false) as HTMLElement;
                  beforeEl.appendChild(beforeFrag);
                  frag.appendChild(beforeEl);
                }

                const middleEl = document.createElement('span');
                middleEl.appendChild(middleFrag);
                frag.appendChild(middleEl);

                if (afterFrag.textContent && afterFrag.textContent.length > 0) {
                  const afterEl = commonHighlight.cloneNode(false) as HTMLElement;
                  afterEl.appendChild(afterFrag);
                  frag.appendChild(afterEl);
                }

                parent.replaceChild(frag, commonHighlight);

                // Reselect middle unmarked text
                const newRange = document.createRange();
                newRange.selectNodeContents(middleEl);
                sel.removeAllRanges();
                sel.addRange(newRange);
              }
            }
          }

          // Strip styling & unwrap any other intersecting highlight elements
          intersectingHighlights.forEach((el) => {
            const htmlEl = el as HTMLElement;
            stripHighlightStyle(htmlEl);
            if (
              htmlEl.tagName.toLowerCase() === 'mark' ||
              (!htmlEl.getAttribute('style') && htmlEl.tagName.toLowerCase() === 'span')
            ) {
              unwrap(htmlEl);
            }
          });

          // Secondary browser native cleanup
          try {
            document.execCommand('hiliteColor', false, 'transparent');
          } catch {}

          handleInput();
          return false; // Successfully unmarked
        } else {
          // ==================== MARCAR (MARK) ====================
          const content = range.extractContents();
          const span = document.createElement('span');
          span.setAttribute('data-highlight', 'true');
          span.style.backgroundColor = color;
          span.style.color = '#1e293b';
          span.style.padding = '2px 4px';
          span.style.borderRadius = '4px';
          span.appendChild(content);

          range.insertNode(span);
          range.selectNode(span);
          sel.removeAllRanges();
          sel.addRange(range);

          handleInput();
          return true; // Successfully marked
        }
      },

      applyFontColor: (color: string) => {
        if (editorDivRef.current) {
          editorDivRef.current.focus();
        }
        restoreSelection();

        if (!color) {
          document.execCommand('removeFormat', false);
        } else {
          const sel = window.getSelection();
          if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const selectedContent = range.extractContents();
            const span = document.createElement('span');
            span.style.color = color;
            span.appendChild(selectedContent);
            range.insertNode(span);
            range.selectNode(span);
            sel.removeAllRanges();
            sel.addRange(range);
          } else {
            document.execCommand('foreColor', false, color);
          }
        }
        handleInput();
      },

      insertImage: (dataUrl: string, name = 'imagem') => {
        if (editorDivRef.current) {
          editorDivRef.current.focus();
        }
        restoreSelection();

        // Create image element styled exactly as requested in print
        const wrapper = document.createElement('div');
        wrapper.className = 'my-4 image-block-wrapper text-left select-none';
        wrapper.setAttribute('contenteditable', 'false');

        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = name;
        img.className = 'note-inline-image max-w-full h-auto rounded-2xl shadow-lg inline-block cursor-pointer transition-transform hover:opacity-95';
        img.style.maxHeight = '520px';
        img.style.objectFit = 'contain';

        wrapper.appendChild(img);

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorDivRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
          const range = sel.getRangeAt(0);
          range.collapse(false);
          range.insertNode(wrapper);

          // Create new paragraph below the image for continuing text seamlessly
          const nextPara = document.createElement('p');
          nextPara.innerHTML = '<br>';
          wrapper.insertAdjacentElement('afterend', nextPara);

          range.selectNodeContents(nextPara);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } else if (editorDivRef.current) {
          editorDivRef.current.appendChild(wrapper);
          const nextPara = document.createElement('p');
          nextPara.innerHTML = '<br>';
          editorDivRef.current.appendChild(nextPara);
        }

        handleInput();
      },

      insertText: (text: string) => {
        if (editorDivRef.current) {
          editorDivRef.current.focus();
        }
        restoreSelection();

        const lines = text.split('\n');
        if (lines.length > 1) {
          const fragment = document.createDocumentFragment();
          lines.forEach((line, idx) => {
            const p = document.createElement('p');
            p.innerHTML = line || '<br>';
            fragment.appendChild(p);
          });

          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0 && editorDivRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(fragment);
            range.collapse(false);
          } else if (editorDivRef.current) {
            editorDivRef.current.appendChild(fragment);
          }
        } else {
          document.execCommand('insertText', false, text);
        }
        handleInput();
      },

      focus: () => {
        editorDivRef.current?.focus();
      },
    }));

    // Handle clicking images inside editor to show floating controls or zoom
    const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
      saveSelection();
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'img') {
        const img = target as HTMLImageElement;
        const rect = img.getBoundingClientRect();
        const editorRect = editorDivRef.current?.getBoundingClientRect();

        if (editorRect) {
          setSelectedImageEl(img);
          setImageToolbarPos({
            top: rect.top - editorRect.top + (editorDivRef.current?.scrollTop || 0) + 12,
            left: rect.left - editorRect.left + 12,
          });
        }
      } else {
        setSelectedImageEl(null);
        setImageToolbarPos(null);
      }
    };

    // Handle Paste: detects image files directly from clipboard and inserts inline
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (uploadEvt) => {
              const dataUrl = uploadEvt.target?.result as string;
              if (dataUrl) {
                const imgName = file.name.replace(/\.[^/.]+$/, '') || 'Imagem';
                if (onAddImage) {
                  onAddImage({
                    id: 'img-' + Date.now(),
                    name: imgName,
                    dataUrl,
                    createdAt: Date.now(),
                  });
                }
                // Insert directly into editor at cursor
                (ref as any)?.current?.insertImage(dataUrl, imgName);
              }
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }
    };

    // Handle Drag & Drop of .txt and images
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (uploadEvt) => {
            const dataUrl = uploadEvt.target?.result as string;
            if (dataUrl) {
              const imgName = file.name.replace(/\.[^/.]+$/, '') || 'Imagem';
              if (onAddImage) {
                onAddImage({
                  id: 'img-' + Date.now(),
                  name: imgName,
                  dataUrl,
                  createdAt: Date.now(),
                });
              }
              (ref as any)?.current?.insertImage(dataUrl, imgName);
            }
          };
          reader.readAsDataURL(file);
        } else if (file.name.toLowerCase().endsWith('.txt') || file.type.includes('text')) {
          onFileDrop(file);
        }
      }
    };

    // Image toolbar actions
    const handleDeleteSelectedImage = () => {
      if (selectedImageEl) {
        const parentWrapper = selectedImageEl.closest('.image-block-wrapper') || selectedImageEl;
        parentWrapper.remove();
        setSelectedImageEl(null);
        setImageToolbarPos(null);
        handleInput();
      }
    };

    const handleAlignImage = (align: 'left' | 'center' | 'right') => {
      if (selectedImageEl) {
        const parentWrapper = selectedImageEl.closest('.image-block-wrapper') as HTMLElement;
        if (parentWrapper) {
          parentWrapper.className = `my-4 image-block-wrapper text-${align} select-none`;
        }
        handleInput();
      }
    };

    const handleResizeImage = (sizePercent: string) => {
      if (selectedImageEl) {
        selectedImageEl.style.width = sizePercent;
        handleInput();
      }
    };

    // Calculate word & character metrics from textContent
    const plainText = editorDivRef.current ? editorDivRef.current.innerText || '' : '';
    const charCount = plainText.replace(/\n/g, '').length;
    const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
    const lineCount = plainText.split('\n').length;

    const fontClass =
      settings.fontFamily === 'monospace'
        ? 'font-mono'
        : settings.fontFamily === 'serif'
        ? 'font-serif'
        : 'font-sans';

    return (
      <main
        id="notepad-editor-section"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden ${
          isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
        }`}
      >
        {/* Editor Main Content Area */}
        <div className="flex-1 relative flex min-h-0 overflow-hidden">
          {settings.showLineNumbers && (
            <div
              className={`hidden sm:flex flex-col items-end py-6 px-3 select-none border-r text-xs font-mono shrink-0 overflow-hidden ${
                isDark
                  ? 'bg-slate-900/60 border-slate-800 text-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                <div key={i} className="leading-relaxed px-1">
                  {i + 1}
                </div>
              ))}
            </div>
          )}

          {/* WYSIWYG ContentEditable Surface */}
          <div
            ref={editorDivRef}
            id="note-wysiwyg-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onClick={handleEditorClick}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            onTouchEnd={saveSelection}
            onPaste={handlePaste}
            data-placeholder="Comece a digitar sua nota aqui... Formatações e imagens aparecem diretamente no texto."
            className={`w-full h-full p-4 sm:p-8 overflow-y-auto focus:outline-hidden leading-relaxed text-base transition-colors ${fontClass} ${
              isDark
                ? 'bg-slate-950 text-slate-100 selection:bg-emerald-600/40'
                : 'bg-white text-slate-900 selection:bg-emerald-300/60'
            }`}
            style={{
              fontSize: `${settings.fontSize}px`,
              color: note.fontColor || settings.fontColor || undefined,
            }}
          />

          {/* Floating Context Toolbar when an image is clicked */}
          {selectedImageEl && imageToolbarPos && (
            <div
              style={{ top: `${imageToolbarPos.top}px`, left: `${imageToolbarPos.left}px` }}
              className="absolute z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/95 text-white border border-slate-700 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
            >
              <button
                type="button"
                onClick={() => setZoomImageSrc({ src: selectedImageEl.src, alt: selectedImageEl.alt })}
                title="Ampliar Imagem"
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              <div className="w-px h-4 bg-slate-700" />

              <button
                type="button"
                onClick={() => handleAlignImage('left')}
                title="Alinhar à Esquerda"
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleAlignImage('center')}
                title="Centralizar Imagem"
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleAlignImage('right')}
                title="Alinhar à Direita"
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                <AlignRight className="w-4 h-4" />
              </button>

              <div className="w-px h-4 bg-slate-700" />

              <button
                type="button"
                onClick={() => handleResizeImage('50%')}
                title="Tamanho 50%"
                className="px-2 py-1 rounded-lg hover:bg-slate-800 text-[11px] font-semibold text-slate-300"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => handleResizeImage('100%')}
                title="Tamanho 100%"
                className="px-2 py-1 rounded-lg hover:bg-slate-800 text-[11px] font-semibold text-slate-300"
              >
                100%
              </button>

              <div className="w-px h-4 bg-slate-700" />

              <button
                type="button"
                onClick={handleDeleteSelectedImage}
                title="Excluir Imagem"
                className="p-1.5 rounded-xl hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Minimalist Android Footer Status Bar */}
        <footer
          id="editor-status-bar"
          className={`flex items-center justify-between px-4 py-2 text-[11px] border-t select-none shrink-0 ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 text-slate-400'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isSaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                }`}
              />
              {isSaving ? 'Salvando...' : 'Salvo no aparelho'}
            </span>
            <span>•</span>
            <span>
              Aba: <strong className="text-emerald-500 font-semibold">{note.title}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px] sm:text-[11px]">
            <span>{charCount} carac.</span>
            <span>•</span>
            <span>{wordCount} pal.</span>
            <span>•</span>
            <span>{lineCount} lin.</span>
          </div>
        </footer>

        {/* Fullscreen Lightbox Zoom Modal */}
        {zoomImageSrc && (
          <div
            onClick={() => setZoomImageSrc(null)}
            className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md"
          >
            <button
              onClick={() => setZoomImageSrc(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={zoomImageSrc.src}
              alt={zoomImageSrc.alt}
              referrerPolicy="no-referrer"
              className="max-h-[88vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl"
            />
            {zoomImageSrc.alt && (
              <div className="mt-3 text-sm text-slate-300 font-medium">
                {zoomImageSrc.alt}
              </div>
            )}
          </div>
        )}
      </main>
    );
  }
);
