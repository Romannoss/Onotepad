/**
 * Client-side API caller for Gemini AI and backend services.
 * Automatically resolves the Cloud Run server URL when running inside
 * the Android APK (Capacitor WebView on localhost).
 */

export function getApiBaseUrl(): string {
  // Check if user set a custom backend URL
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('gemini_custom_server_url');
    if (customUrl && customUrl.trim()) {
      return customUrl.trim().replace(/\/+$/, '');
    }
  }

  // Check if running on Android APK or local WebView
  const isAndroidOrLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:' ||
      Boolean((window as any).AndroidFileBridge));

  if (isAndroidOrLocal) {
    const configuredUrl = ((import.meta as any).env?.VITE_APP_URL as string) || '';
    if (configuredUrl && !configuredUrl.includes('localhost')) {
      return configuredUrl.replace(/\/+$/, '');
    }
    // Default fallback to Cloud Run deployment
    return 'https://ais-dev-b2q6upqvtuzoi2sdseqqji-224066836608.us-east1.run.app';
  }

  // Direct web browser
  return '';
}

export async function apiFetch<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${baseUrl}${cleanEndpoint}`;

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();

    // Check if response is HTML (e.g. Capacitor fallback to index.html or 404 page)
    if (!contentType.includes('application/json') || rawText.trim().startsWith('<!doctype') || rawText.trim().startsWith('<html')) {
      throw new Error(
        'O servidor retornou uma página HTML em vez de dados da IA. Verifique a conexão com o servidor ou tente novamente em instantes.'
      );
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error('Formato de resposta inválido retornado pelo servidor.');
    }

    if (!res.ok) {
      throw new Error(data.error || `Erro na comunicação com a IA (${res.status})`);
    }

    return data as T;
  } catch (err: any) {
    console.warn(`API call to ${fullUrl} failed:`, err);
    throw err;
  }
}

/**
 * Clean and prepare text locally for audio reading if offline
 */
export function prepareOfflineLocucao(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#+\s+/gm, '') // Remove Markdown headers
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italic
    .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links keeping label
    .replace(/^[-*+]\s+/gm, '• ') // Normalize bullet points
    .replace(/^\d+\.\s+/gm, '') // Remove numbered lists
    .replace(/https?:\/\/\S+/gi, 'link') // Replace raw URLs with "link"
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract summary locally if offline
 */
export function prepareOfflineResumo(text: string): string {
  const cleaned = prepareOfflineLocucao(text);
  if (!cleaned) return '';

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  if (sentences.length <= 3) {
    return cleaned;
  }

  // Pick first 2-3 most informative sentences
  const summarySentences = sentences.slice(0, 3);
  return `Resumo da nota: ${summarySentences.join(' ')}`;
}
