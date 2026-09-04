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

/**
 * Calculates the next available sequential tab number based on currently open notes.
 * Finds the lowest unused integer >= 1 so tab numbers are always sequential and never jump:
 * e.g., if only "nota 1" exists, next is guaranteed to be 2 ("nota 2").
 */
export function getNextTabNumber(existingNotes: NoteTab[]): number {
  if (!existingNotes || existingNotes.length === 0) {
    return 1;
  }

  const usedNumbers = new Set<number>();
  existingNotes.forEach((note) => {
    if (typeof note.tabNumber === 'number' && note.tabNumber > 0) {
      usedNumbers.add(note.tabNumber);
    }
    const match = note.title.match(/nota\s*(\d+)/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        usedNumbers.add(parsed);
      }
    }
  });

  let candidate = 1;
  while (usedNumbers.has(candidate)) {
    candidate++;
  }
  return candidate;
}

export function loadNotesFromStorage(): { notes: NoteTab[]; activeId: string; nextTabNumber: number } {
  try {
    const rawNotes = localStorage.getItem(STORAGE_NOTES_KEY);
    const rawActiveId = localStorage.getItem(STORAGE_ACTIVE_TAB_KEY);

    let notes: NoteTab[] = [];
    if (rawNotes) {
      notes = JSON.parse(rawNotes);
    }

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
      const nextTabNumber = 2;
      localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(notes));
      localStorage.setItem(STORAGE_COUNTER_KEY, nextTabNumber.toString());
      localStorage.setItem(STORAGE_ACTIVE_TAB_KEY, firstNote.id);
      return { notes, activeId: firstNote.id, nextTabNumber };
    }

    // Automatic fix for the bug in v3.2 where second tab was accidentally named "nota 8":
    // If only 2 tabs exist, first is "nota 1" and second is "nota 8" (or tabNumber 8) with empty/welcome content
    if (
      notes.length === 2 &&
      notes[0].title.toLowerCase().trim() === 'nota 1' &&
      notes[1].title.toLowerCase().trim() === 'nota 8' &&
      (!notes[1].content || notes[1].content.trim() === '')
    ) {
      notes[1].title = 'nota 2';
      notes[1].tabNumber = 2;
      localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(notes));
    }

    const nextTabNumber = getNextTabNumber(notes);
    localStorage.setItem(STORAGE_COUNTER_KEY, nextTabNumber.toString());

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
 * Converts rich HTML content to clean plain text for saving as .txt files
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  // If plain text without HTML tags
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Replace images with descriptive text
  const images = doc.querySelectorAll('img');
  images.forEach((img) => {
    const alt = img.getAttribute('alt') || 'imagem';
    const marker = doc.createTextNode(`\n[Imagem: ${alt}]\n`);
    img.parentNode?.replaceChild(marker, img);
  });

  // Ensure line breaks for block elements
  const blocks = doc.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, br');
  blocks.forEach((el) => {
    if (el.tagName.toLowerCase() === 'br') {
      el.replaceWith('\n');
    } else {
      el.insertAdjacentText('afterend', '\n');
    }
  });

  const raw = doc.body.textContent || '';
  return raw
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts imported plain text from .txt to HTML format for the WYSIWYG editor
 */
export function textToEditorHtml(text: string): string {
  if (!text) return '';
  // If it already looks like HTML with tags, keep it
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }
  return text
    .split('\n')
    .map((line) => (line.trim() ? `<p>${line}</p>` : '<p><br></p>'))
    .join('');
}

/**
 * Saves a .txt file directly to the Android device / computer
 */
export async function saveTextFileToDevice(note: NoteTab): Promise<{ success: boolean; filename: string }> {
  const content = htmlToPlainText(note.content);
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
