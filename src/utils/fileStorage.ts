import { NoteTab, AppSettings } from '../types';

const STORAGE_NOTES_KEY = 'android_notes_tabs_v1';
const STORAGE_SETTINGS_KEY = 'android_notes_settings_v1';
const STORAGE_ACTIVE_TAB_KEY = 'android_notes_active_id_v1';
const STORAGE_COUNTER_KEY = 'android_notes_counter_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  barPosition: 'top',
  fontSize: 16,
  fontFamily: 'sans',
  showLineNumbers: false,
  wordWrap: true,
  autoSaveDelay: 400,
};

export function loadNotesFromStorage(): { notes: NoteTab[]; activeId: string; nextTabNumber: number } {
  try {
    const rawNotes = localStorage.getItem(STORAGE_NOTES_KEY);
    const rawActiveId = localStorage.getItem(STORAGE_ACTIVE_TAB_KEY);
    const rawCounter = localStorage.getItem(STORAGE_COUNTER_KEY);

    let notes: NoteTab[] = [];
    if (rawNotes) {
      notes = JSON.parse(rawNotes);
    }

    let nextTabNumber = rawCounter ? parseInt(rawCounter, 10) : 1;
    if (isNaN(nextTabNumber) || nextTabNumber < 1) nextTabNumber = 1;

    // If no notes exist initially, create the first default note "nota 1"
    if (!notes || notes.length === 0) {
      const firstNote: NoteTab = {
        id: 'note-' + Date.now(),
        tabNumber: 1,
        title: 'nota 1',
        content: 'Bem-vindo ao Bloco de Notas!\n\n• Toque no "+" para criar uma nova aba (ex: nota 2, nota 3).\n• Use o menu ☰ para Salvar (.txt no aparelho), Abrir arquivo .txt, formatar texto (Negrito, Itálico, Sublinhado) ou mudar a barra para baixo.\n• Suas notas são salvas automaticamente!',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      notes = [firstNote];
      nextTabNumber = 2;
      localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(notes));
      localStorage.setItem(STORAGE_COUNTER_KEY, nextTabNumber.toString());
      localStorage.setItem(STORAGE_ACTIVE_TAB_KEY, firstNote.id);
      return { notes, activeId: firstNote.id, nextTabNumber };
    }

    const activeId = rawActiveId && notes.some(n => n.id === rawActiveId) ? rawActiveId : notes[0].id;
    return { notes, activeId, nextTabNumber };
  } catch (error) {
    console.error('Error loading notes from localStorage:', error);
    const fallbackNote: NoteTab = {
      id: 'note-' + Date.now(),
      tabNumber: 1,
      title: 'nota 1',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return { notes: [fallbackNote], activeId: fallbackNote.id, nextTabNumber: 2 };
  }
}

export function saveNotesToStorage(notes: NoteTab[], activeId: string, nextTabNumber: number): void {
  try {
    localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(notes));
    localStorage.setItem(STORAGE_ACTIVE_TAB_KEY, activeId);
    localStorage.setItem(STORAGE_COUNTER_KEY, nextTabNumber.toString());
  } catch (error) {
    console.error('Error saving notes to localStorage:', error);
  }
}

export function loadSettingsFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettingsToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}

/**
 * Saves a .txt file directly to the Android device / computer
 */
export async function saveTextFileToDevice(note: NoteTab): Promise<{ success: boolean; filename: string }> {
  const content = note.content;
  const sanitizedTitle = note.title.trim().replace(/[/\\?%*:|"<>]/g, '_') || `nota_${note.tabNumber}`;
  const filename = sanitizedTitle.toLowerCase().endsWith('.txt') ? sanitizedTitle : `${sanitizedTitle}.txt`;

  // Try modern File System Access API if available on Android Chrome
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Arquivo de Texto (.txt)',
            accept: {
              'text/plain': ['.txt'],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return { success: true, filename: handle.name || filename };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, filename };
      }
      // Fall through to fallback
    }
  }

  // Universal fallback for Android & all browsers (Blob + download anchor)
  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
    return { success: true, filename };
  } catch (err) {
    console.error('Failed to save file:', err);
    return { success: false, filename };
  }
}

/**
 * Reads a .txt file selected by the user
 */
export function readTextFile(file: File): Promise<{ content: string; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve({
        content: text || '',
        name: file.name.replace(/\.txt$/i, ''),
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file, 'UTF-8');
  });
}
