import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { NoteTab, AppSettings } from '../types';
import { Check, Clock, Type, AlignLeft, Hash } from 'lucide-react';

export interface EditorHandle {
  applyFormatting: (type: 'bold' | 'italic' | 'underline' | 'list' | 'timestamp') => void;
  insertText: (text: string) => void;
  focus: () => void;
}

interface EditorProps {
  note: NoteTab;
  settings: AppSettings;
  onChangeContent: (content: string) => void;
  onFileDrop: (file: File) => void;
  isSaving: boolean;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(
  ({ note, settings, onChangeContent, onFileDrop, isSaving }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isDark = settings.theme === 'dark';

    // Apply formatting to selection
    useImperativeHandle(ref, () => ({
      applyFormatting: (type) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const selectedText = value.substring(start, end);

        let newText = value;
        let newCursorStart = start;
        let newCursorEnd = end;

        switch (type) {
          case 'bold': {
            const prefix = '**';
            const suffix = '**';
            if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length >= 4) {
              // Unwrap bold
              const unwrapped = selectedText.slice(2, -2);
              newText = value.substring(0, start) + unwrapped + value.substring(end);
              newCursorStart = start;
              newCursorEnd = start + unwrapped.length;
            } else {
              const formatted = `${prefix}${selectedText || 'texto em negrito'}${suffix}`;
              newText = value.substring(0, start) + formatted + value.substring(end);
              newCursorStart = start + prefix.length;
              newCursorEnd = selectedText ? start + formatted.length : start + prefix.length + 16;
            }
            break;
          }
          case 'italic': {
            const prefix = '*';
            const suffix = '*';
            if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length >= 2) {
              // Unwrap italic
              const unwrapped = selectedText.slice(1, -1);
              newText = value.substring(0, start) + unwrapped + value.substring(end);
              newCursorStart = start;
              newCursorEnd = start + unwrapped.length;
            } else {
              const formatted = `${prefix}${selectedText || 'texto em itálico'}${suffix}`;
              newText = value.substring(0, start) + formatted + value.substring(end);
              newCursorStart = start + prefix.length;
              newCursorEnd = selectedText ? start + formatted.length : start + prefix.length + 17;
            }
            break;
          }
          case 'underline': {
            const prefix = '<u>';
            const suffix = '</u>';
            if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length >= 7) {
              // Unwrap underline
              const unwrapped = selectedText.slice(3, -4);
              newText = value.substring(0, start) + unwrapped + value.substring(end);
              newCursorStart = start;
              newCursorEnd = start + unwrapped.length;
            } else {
              const formatted = `${prefix}${selectedText || 'texto sublinhado'}${suffix}`;
              newText = value.substring(0, start) + formatted + value.substring(end);
              newCursorStart = start + prefix.length;
              newCursorEnd = selectedText ? start + formatted.length : start + prefix.length + 17;
            }
            break;
          }
          case 'list': {
            if (selectedText) {
              const lines = selectedText.split('\n');
              const formattedLines = lines.map(line => line.startsWith('• ') ? line.slice(2) : `• ${line}`).join('\n');
              newText = value.substring(0, start) + formattedLines + value.substring(end);
              newCursorStart = start;
              newCursorEnd = start + formattedLines.length;
            } else {
              const bullet = '\n• ';
              newText = value.substring(0, start) + bullet + value.substring(end);
              newCursorStart = start + bullet.length;
              newCursorEnd = newCursorStart;
            }
            break;
          }
          case 'timestamp': {
            const now = new Date();
            const timeStr = `[${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] `;
            newText = value.substring(0, start) + timeStr + value.substring(end);
            newCursorStart = start + timeStr.length;
            newCursorEnd = newCursorStart;
            break;
          }
        }

        onChangeContent(newText);

        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorStart, newCursorEnd);
          }
        }, 10);
      },
      insertText: (text) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const newText = value.substring(0, start) + text + value.substring(end);
        onChangeContent(newText);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            const newPos = start + text.length;
            textareaRef.current.setSelectionRange(newPos, newPos);
          }
        }, 10);
      },
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    // Word and character counting
    const content = note.content || '';
    const charCount = content.length;
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const lineCount = content.split('\n').length;

    // Handle Drag & Drop of .txt files
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.toLowerCase().endsWith('.txt') || file.type.includes('text')) {
          onFileDrop(file);
        }
      }
    };

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
          isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
        }`}
      >
        {/* Main Textarea Area */}
        <div className="flex-1 relative flex min-h-0 overflow-hidden">
          {settings.showLineNumbers && (
            <div
              className={`hidden sm:flex flex-col items-end py-4 px-2 select-none border-r text-xs font-mono shrink-0 overflow-hidden ${
                isDark
                  ? 'bg-slate-900/60 border-slate-800 text-slate-600'
                  : 'bg-slate-100 border-slate-300 text-slate-400'
              }`}
            >
              {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                <div key={i} className="leading-relaxed px-1">
                  {i + 1}
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            id="note-editor-textarea"
            value={note.content}
            onChange={(e) => onChangeContent(e.target.value)}
            placeholder="Comece a digitar sua nota aqui... Toque no menu ☰ para salvar no aparelho ou formatar texto."
            spellCheck={false}
            autoCapitalize="sentences"
            autoCorrect="on"
            className={`w-full h-full p-4 sm:p-6 resize-none focus:outline-hidden leading-relaxed text-base transition-colors ${fontClass} ${
              settings.wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
            } ${
              isDark
                ? 'bg-slate-950 text-slate-100 placeholder-slate-600 selection:bg-emerald-600/40'
                : 'bg-slate-50 text-slate-900 placeholder-slate-400 selection:bg-emerald-300/60'
            }`}
            style={{ fontSize: `${settings.fontSize}px` }}
          />
        </div>

        {/* Minimalist Android Footer Status Bar */}
        <footer
          id="editor-status-bar"
          className={`flex items-center justify-between px-3 py-1.5 text-[11px] border-t select-none shrink-0 ${
            isDark
              ? 'bg-slate-900/80 border-slate-800/80 text-slate-400'
              : 'bg-slate-100/90 border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium">
              <span className={`inline-block w-2 h-2 rounded-full ${isSaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              {isSaving ? 'Salvando...' : 'Salvo no aparelho'}
            </span>
            <span className="hidden xs:inline text-slate-500">•</span>
            <span className="hidden xs:inline">
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
      </main>
    );
  }
);
