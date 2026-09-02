/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NoteTab, AppSettings, ToastMessage } from './types';
import {
  loadNotesFromStorage,
  saveNotesToStorage,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  saveTextFileToDevice,
  readTextFile,
  DEFAULT_SETTINGS,
} from './utils/fileStorage';
import { MainBar } from './components/MainBar';
import { Editor, EditorHandle } from './components/Editor';
import { HamburgerMenu } from './components/HamburgerMenu';
import { ToastContainer } from './components/Toast';
import { RenameModal } from './components/RenameModal';
import { SearchModal } from './components/SearchModal';

export default function App() {
  // State from storage
  const [notes, setNotes] = useState<NoteTab[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [nextTabNumber, setNextTabNumber] = useState<number>(1);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // UI state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renamingNote, setRenamingNote] = useState<NoteTab | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Hidden file input for opening .txt files
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<EditorHandle>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add toast helper
  const addToast = (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial load from storage
  useEffect(() => {
    const loaded = loadNotesFromStorage();
    const loadedSettings = loadSettingsFromStorage();
    setNotes(loaded.notes);
    setActiveId(loaded.activeId);
    setNextTabNumber(loaded.nextTabNumber);
    setSettings(loadedSettings);

    // Apply dark/light theme to document root
    if (loadedSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Sync theme changes to html class and storage
  const handleToggleTheme = () => {
    setSettings((prev) => {
      const newTheme = prev.theme === 'dark' ? 'light' : 'dark';
      const updated = { ...prev, theme: newTheme };
      saveSettingsToStorage(updated);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      addToast(`Tema alterado para ${newTheme === 'dark' ? 'Escuro' : 'Claro'}`, 'info');
      return updated;
    });
  };

  // Toggle toolbar position (top <-> bottom)
  const handleToggleBarPosition = () => {
    setSettings((prev) => {
      const newPos = prev.barPosition === 'top' ? 'bottom' : 'top';
      const updated = { ...prev, barPosition: newPos };
      saveSettingsToStorage(updated);
      addToast(`Barra posicionada na ${newPos === 'bottom' ? 'parte de baixo' : 'parte superior'} da tela`, 'info');
      return updated;
    });
  };

  // Auto-save notes whenever notes, activeId, or nextTabNumber change
  const triggerAutoSave = useCallback((updatedNotes: NoteTab[], curActiveId: string, counter: number) => {
    setIsSaving(true);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveNotesToStorage(updatedNotes, curActiveId, counter);
      setIsSaving(false);
    }, 250);
  }, []);

  // Update content of currently active note
  const handleContentChange = (newContent: string) => {
    setNotes((prevNotes) => {
      const updated = prevNotes.map((note) =>
        note.id === activeId ? { ...note, content: newContent, updatedAt: Date.now() } : note
      );
      triggerAutoSave(updated, activeId, nextTabNumber);
      return updated;
    });
  };

  // Create new tab titled "nota + o numero de aba"
  const handleNewTab = () => {
    const tabNum = nextTabNumber;
    const newNote: NoteTab = {
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      tabNumber: tabNum,
      title: `nota ${tabNum}`,
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newCounter = tabNum + 1;
    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    setActiveId(newNote.id);
    setNextTabNumber(newCounter);
    triggerAutoSave(updatedNotes, newNote.id, newCounter);
    addToast(`Aba "${newNote.title}" criada!`, 'success');

    setTimeout(() => {
      editorRef.current?.focus();
    }, 50);
  };

  // Close a tab
  const handleCloseTab = (idToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notes.length <= 1) {
      addToast('Você deve manter ao menos uma aba aberta.', 'warning');
      return;
    }

    const noteToClose = notes.find((n) => n.id === idToClose);
    const updatedNotes = notes.filter((n) => n.id !== idToClose);

    let newActiveId = activeId;
    if (activeId === idToClose) {
      const closedIndex = notes.findIndex((n) => n.id === idToClose);
      const nextActive = updatedNotes[Math.max(0, closedIndex - 1)];
      newActiveId = nextActive.id;
    }

    setNotes(updatedNotes);
    setActiveId(newActiveId);
    triggerAutoSave(updatedNotes, newActiveId, nextTabNumber);
    addToast(`Aba "${noteToClose?.title || 'nota'}" fechada.`, 'info');
  };

  // Rename a tab
  const handleStartRename = (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (note) {
      setRenamingNote(note);
      setIsRenameOpen(true);
    }
  };

  const handleFinishRename = (id: string, newTitle: string) => {
    const updatedNotes = notes.map((n) => (n.id === id ? { ...n, title: newTitle, updatedAt: Date.now() } : n));
    setNotes(updatedNotes);
    triggerAutoSave(updatedNotes, activeId, nextTabNumber);
    addToast(`Aba renomeada para "${newTitle}"`, 'success');
  };

  // Duplicate current note
  const handleDuplicateNote = () => {
    const current = notes.find((n) => n.id === activeId);
    if (!current) return;

    const tabNum = nextTabNumber;
    const duplicated: NoteTab = {
      id: 'note-' + Date.now(),
      tabNumber: tabNum,
      title: `${current.title} (Cópia)`,
      content: current.content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newCounter = tabNum + 1;
    const updatedNotes = [...notes, duplicated];
    setNotes(updatedNotes);
    setActiveId(duplicated.id);
    setNextTabNumber(newCounter);
    triggerAutoSave(updatedNotes, duplicated.id, newCounter);
    addToast(`Nota "${duplicated.title}" duplicada!`, 'success');
  };

  // Clear current note content
  const handleDeleteCurrentNote = () => {
    const current = notes.find((n) => n.id === activeId);
    if (!current) return;

    if (current.content.trim().length === 0 && notes.length > 1) {
      // Just close tab if empty
      const updatedNotes = notes.filter((n) => n.id !== activeId);
      const newActiveId = updatedNotes[0].id;
      setNotes(updatedNotes);
      setActiveId(newActiveId);
      triggerAutoSave(updatedNotes, newActiveId, nextTabNumber);
      addToast(`Aba "${current.title}" removida.`, 'info');
      return;
    }

    if (window.confirm(`Deseja limpar todo o conteúdo da aba "${current.title}"?`)) {
      handleContentChange('');
      addToast(`Conteúdo da aba "${current.title}" limpo.`, 'info');
    }
  };

  // Save current note as .txt file on Android device
  const handleSaveFile = async () => {
    const current = notes.find((n) => n.id === activeId);
    if (!current) return;

    try {
      const res = await saveTextFileToDevice(current);
      if (res.success) {
        addToast(`Arquivo "${res.filename}" salvo com sucesso no aparelho!`, 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('Não foi possível salvar o arquivo.', 'error');
    }
  };

  // Open .txt file picker
  const handleOpenFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Process opened .txt file
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await processTextFile(file);
  };

  const processTextFile = async (file: File) => {
    try {
      const { content, name } = await readTextFile(file);
      const current = notes.find((n) => n.id === activeId);

      // If current tab is empty, load into current tab, else create new tab
      if (current && current.content.trim().length === 0 && current.title.startsWith('nota ')) {
        const updatedNotes = notes.map((n) =>
          n.id === activeId ? { ...n, title: name || n.title, content, updatedAt: Date.now(), fileName: file.name } : n
        );
        setNotes(updatedNotes);
        triggerAutoSave(updatedNotes, activeId, nextTabNumber);
        addToast(`Arquivo "${file.name}" carregado nesta aba!`, 'success');
      } else {
        const tabNum = nextTabNumber;
        const newNote: NoteTab = {
          id: 'note-' + Date.now(),
          tabNumber: tabNum,
          title: name || `nota ${tabNum}`,
          content,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          fileName: file.name,
        };

        const newCounter = tabNum + 1;
        const updatedNotes = [...notes, newNote];
        setNotes(updatedNotes);
        setActiveId(newNote.id);
        setNextTabNumber(newCounter);
        triggerAutoSave(updatedNotes, newNote.id, newCounter);
        addToast(`Arquivo "${file.name}" aberto em nova aba!`, 'success');
      }
    } catch (err) {
      console.error('Failed to read file:', err);
      addToast('Erro ao ler o arquivo .txt selecionado.', 'error');
    }
  };

  // Formatting actions (Bold, Italic, Underline)
  const handleFormat = (type: 'bold' | 'italic' | 'underline') => {
    editorRef.current?.applyFormatting(type);
    const labels = {
      bold: 'Negrito (**texto**)',
      italic: 'Itálico (*texto*)',
      underline: 'Sublinhado (<u>texto</u>)',
    };
    addToast(`Formatação aplicada: ${labels[type]}`, 'info');
  };

  // Replace all text in current note
  const handleReplaceAll = (search: string, replace: string) => {
    const current = notes.find((n) => n.id === activeId);
    if (!current) return;

    try {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const newContent = current.content.replace(regex, replace);
      handleContentChange(newContent);
      addToast(`Texto substituído com sucesso!`, 'success');
    } catch (e) {
      console.error(e);
      addToast('Erro ao substituir texto.', 'error');
    }
  };

  // Keyboard shortcuts (Ctrl+S / Cmd+S, Ctrl+N, Ctrl+B, Ctrl+I, Ctrl+U)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewTab();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleFormat('bold');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        handleFormat('italic');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        handleFormat('underline');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeId, notes, nextTabNumber]);

  // Find currently active note
  const activeNote = notes.find((n) => n.id === activeId) ||
    notes[0] || {
      id: 'default',
      tabNumber: 1,
      title: 'nota 1',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

  return (
    <div
      id="android-notepad-app"
      className="flex flex-col h-screen w-screen overflow-hidden select-none bg-slate-900 text-slate-100"
    >
      {/* Hidden File Input for opening .txt files */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,text/plain"
        onChange={handleFileInputChange}
        className="hidden"
        id="file-input-txt"
      />

      {/* Main Bar (renders at top or bottom according to settings.barPosition) */}
      <MainBar
        notes={notes}
        activeNote={activeNote}
        settings={settings}
        onSelectTab={(id) => setActiveId(id)}
        onNewTab={handleNewTab}
        onCloseTab={handleCloseTab}
        onRenameTab={handleStartRename}
        onOpenMenu={() => setIsMenuOpen(true)}
        onSaveFile={handleSaveFile}
        onFormat={handleFormat}
        isSaving={isSaving}
      />

      {/* Notepad Editor Area */}
      <div className="flex-1 flex flex-col min-h-0 order-2 overflow-hidden">
        <Editor
          ref={editorRef}
          note={activeNote}
          settings={settings}
          onChangeContent={handleContentChange}
          onFileDrop={processTextFile}
          isSaving={isSaving}
        />
      </div>

      {/* Hamburger Options Menu (Drawer / Bottom Sheet) */}
      <HamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeNote={activeNote}
        settings={settings}
        onSaveFile={handleSaveFile}
        onOpenFile={handleOpenFileClick}
        onFormat={handleFormat}
        onToggleBarPosition={handleToggleBarPosition}
        onToggleTheme={handleToggleTheme}
        onNewTab={handleNewTab}
        onDeleteCurrentNote={handleDeleteCurrentNote}
        onOpenSearch={() => setIsSearchOpen(true)}
        onDuplicateNote={handleDuplicateNote}
      />

      {/* Rename Tab Modal Dialog */}
      <RenameModal
        isOpen={isRenameOpen}
        onClose={() => {
          setIsRenameOpen(false);
          setRenamingNote(null);
        }}
        note={renamingNote}
        onRename={handleFinishRename}
        theme={settings.theme}
      />

      {/* Search & Replace Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        content={activeNote.content}
        onReplaceAll={handleReplaceAll}
        theme={settings.theme}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
