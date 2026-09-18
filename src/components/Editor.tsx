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
      if (sel && sel.rangeCount > 0 && editorDivRef.current) {
        try {
          const range = sel.getRangeAt(0);
          if (editorDivRef.current.contains(range.commonAncestorContainer)) {
            savedRangeRef.current = range.cloneRange();
          }
        } catch {}
      }
    }, []);

    // Listen to document selectionchange for Android mobile selection handles
    useEffect(() => {
      const handleDocSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorDivRef.current) {
          try {
            const range = sel.getRangeAt(0);
            if (editorDivRef.current.contains(range.commonAncestorContainer)) {
              savedRangeRef.current = range.cloneRange();
            }
          } catch {}
        }
      };
      document.addEventListener('selectionchange', handleDocSelection);
      return () => document.removeEventListener('selectionchange', handleDocSelection);
    }, []);

    // Restore text selection/range before executing formatting commands
    const restoreSelection = useCallback(() => {
      const sel = window.getSelection();
      if (!sel) return null;

      // If active selection is already inside editor and valid, use it
      if (
        sel.rangeCount > 0 &&
        editorDivRef.current &&
        editorDivRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)
      ) {
        const currentRange = sel.getRangeAt(0);
        if (!currentRange.collapsed || !savedRangeRef.current) {
          return currentRange;
        }
      }

      // Otherwise restore saved range
      if (savedRangeRef.current && editorDivRef.current) {
        try {
          sel.removeAllRanges();
          sel.addRange(savedRangeRef.current);
          return savedRangeRef.current;
        } catch (e) {
          console.warn('Failed to restore range:', e);
        }
      }
      return sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
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
        const restoredRange = restoreSelection();
        const sel = window.getSelection();
        if (!sel || !editorDivRef.current) {
          return false;
        }

        const range = restoredRange || (sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
        if (!range || !editorDivRef.current.contains(range.commonAncestorContainer)) {
          return false;
        }

        // Helper to check if an element is a highlight
        const isHighlightElement = (el: HTMLElement | null): boolean => {
          if (!el || el === editorDivRef.current) return false;
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

        // Helper to find closest highlight ancestor
        const findHighlightAncestor = (node: Node | null): HTMLElement | null => {
          let curr: Node | null = node;
          while (curr && curr !== editorDivRef.current) {
            if (curr.nodeType === Node.ELEMENT_NODE && isHighlightElement(curr as HTMLElement)) {
              return curr as HTMLElement;
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

        // Case A: Selection is collapsed (cursor at a single point)
        if (range.collapsed) {
          const highlightParent = findHighlightAncestor(range.startContainer);
          if (highlightParent) {
            unwrap(highlightParent);
            handleInput();
            return false; // Unmarked
          }

          // If inside a text node, mark the word at cursor safely without breaking DOM
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            const textNode = range.startContainer as Text;
            const fullText = textNode.nodeValue || '';
            const offset = range.startOffset;

            let start = offset;
            let end = offset;
            while (start > 0 && /\S/.test(fullText[start - 1])) start--;
            while (end < fullText.length && /\S/.test(fullText[end])) end++;

            if (end > start) {
              if (end < fullText.length) {
                textNode.splitText(end);
              }
              let wordNode = textNode;
              if (start > 0) {
                wordNode = textNode.splitText(start);
              }

              const mark = document.createElement('mark');
              mark.setAttribute('data-highlight', 'true');
              mark.style.backgroundColor = color;
              mark.style.color = '#1e293b';
              mark.style.padding = '2px 4px';
              mark.style.borderRadius = '4px';

              wordNode.parentNode?.insertBefore(mark, wordNode);
              mark.appendChild(wordNode);

              const newRange = document.createRange();
              newRange.selectNodeContents(mark);
              sel.removeAllRanges();
              sel.addRange(newRange);
              savedRangeRef.current = newRange.cloneRange();

              handleInput();
              return true; // Marked
            }
          }
          return false;
        }

        // Case B: Selection is NOT collapsed (user selected a range of text)
        // Check if selection intersects any existing highlights
        const allHighlights = Array.from(
          editorDivRef.current.querySelectorAll('mark, [data-highlight="true"]')
        ).filter((el) => isHighlightElement(el as HTMLElement)) as HTMLElement[];

        const intersectingHighlights = allHighlights.filter((el) => {
          try {
            return range.intersectsNode(el);
          } catch {
            return false;
          }
        });

        const ancestorHighlight = findHighlightAncestor(range.commonAncestorContainer) ||
          findHighlightAncestor(range.startContainer) ||
          findHighlightAncestor(range.endContainer);

        if (ancestorHighlight || intersectingHighlights.length > 0) {
          // ==================== UNMARK ====================
          if (ancestorHighlight) {
            unwrap(ancestorHighlight);
          }
          intersectingHighlights.forEach((el) => unwrap(el));
          handleInput();
          return false; // Unmarked
        }

        // ==================== MARK (Safe Text-Node Level Wrapping) ====================
        // Collect all Text nodes intersecting the range inside editorDivRef
        const textNodes: Text[] = [];
        const walker = document.createTreeWalker(
          editorDivRef.current,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              try {
                return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
              } catch {
                return NodeFilter.FILTER_REJECT;
              }
            }
          }
        );

        let curr = walker.nextNode();
        while (curr) {
          textNodes.push(curr as Text);
          curr = walker.nextNode();
        }

        if (textNodes.length === 0) {
          return false;
        }

        const createdMarks: HTMLElement[] = [];

        textNodes.forEach((node) => {
          const isStartNode = node === range.startContainer;
          const isEndNode = node === range.endContainer;
          const nodeLen = node.nodeValue?.length || 0;
          const startOffset = isStartNode ? Math.min(range.startOffset, nodeLen) : 0;
          const endOffset = isEndNode ? Math.min(range.endOffset, nodeLen) : nodeLen;

          if (startOffset >= endOffset) {
            return;
          }

          if (endOffset < nodeLen) {
            node.splitText(endOffset);
          }

          let nodeToWrap = node;
          if (startOffset > 0) {
            nodeToWrap = node.splitText(startOffset);
          }

          if (nodeToWrap.nodeValue && nodeToWrap.nodeValue.trim().length > 0) {
            const mark = document.createElement('mark');
            mark.setAttribute('data-highlight', 'true');
            mark.style.backgroundColor = color;
            mark.style.color = '#1e293b';
            mark.style.padding = '2px 4px';
            mark.style.borderRadius = '4px';

            nodeToWrap.parentNode?.insertBefore(mark, nodeToWrap);
            mark.appendChild(nodeToWrap);
            createdMarks.push(mark);
          }
        });

        if (createdMarks.length > 0) {
          const newRange = document.createRange();
          newRange.setStartBefore(createdMarks[0]);
          newRange.setEndAfter(createdMarks[createdMarks.length - 1]);
          sel.removeAllRanges();
          sel.addRange(newRange);
          savedRangeRef.current = newRange.cloneRange();
        }

        handleInput();
        return true; // Marked
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
