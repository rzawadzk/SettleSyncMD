import i18n from '../i18n';

const API_BASE = '/api';

const ERROR_MAP: Record<string, Record<number, string>> = {
  pl: {
    400: 'Nieprawidłowe dane. Sprawdź formularz i spróbuj ponownie.',
    401: 'Sesja wygasła. Zaloguj się ponownie.',
    403: 'Brak uprawnień do tej operacji.',
    404: 'Nie znaleziono zasobu.',
    409: 'Odpowiedź została już wysłana.',
    410: 'Link wygasł. Poproś arbitra o nowy link.',
    429: 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.',
    500: 'Błąd serwera. Spróbuj ponownie za chwilę.',
  },
  en: {
    400: 'Invalid data. Please check the form and try again.',
    401: 'Session expired. Please log in again.',
    403: 'You do not have permission for this action.',
    404: 'Resource not found.',
    409: 'Response has already been submitted.',
    410: 'This link has expired. Ask the arbiter for a new link.',
    429: 'Too many attempts. Please wait a moment and try again.',
    500: 'Server error. Please try again shortly.',
  },
};

function getErrorMessage(status: number, serverMessage?: string): string {
  const lang = i18n.language?.startsWith('pl') ? 'pl' : 'en';
  const mapped = ERROR_MAP[lang]?.[status];
  if (mapped) return mapped;
  return serverMessage || (lang === 'pl' ? 'Wystąpił nieoczekiwany błąd.' : 'An unexpected error occurred.');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('settlesync_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...headers, ...options?.headers },
    });
  } catch {
    const lang = i18n.language?.startsWith('pl') ? 'pl' : 'en';
    throw new Error(
      lang === 'pl'
        ? 'Brak połączenia z serwerem. Sprawdź połączenie internetowe.'
        : 'Cannot connect to server. Check your internet connection.'
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(getErrorMessage(res.status, body.error));
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
};
