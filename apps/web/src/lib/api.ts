/** در مرورگر: اگر خالی باشد درخواست‌ها به همان دامنه (/api) می‌روند */
export const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL ?? '';
const SERVER_API = process.env.API_INTERNAL_URL || PUBLIC_API || 'http://localhost:4000';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const TOKEN_KEY = 'dornela_token';

const base = () => (typeof window === 'undefined' ? SERVER_API : PUBLIC_API);
export const apiUrl = (path: string) => `${base()}/api${path}`;

/** عکس‌های آپلودشده از API می‌آیند، عکس‌های ثابت از پوشه public */
export const mediaUrl = (url?: string | null) =>
  !url ? '/img/placeholder.svg' : url.startsWith('/uploads') ? `${PUBLIC_API}${url}` : url;

export const absoluteMedia = (url?: string | null) => {
  const u = mediaUrl(url);
  return u.startsWith('http') ? u : `${SITE_URL}${u}`;
};

export function getToken() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  revalidate?: number;
  auth?: boolean;
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = any>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, revalidate, auth = false } = options;
  const token = options.token ?? (auth ? getToken() : null);

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...(revalidate !== undefined ? { next: { revalidate } } : { cache: 'no-store' as RequestCache }),
    });
  } catch {
    throw new ApiError('ارتباط با سرور برقرار نشد. اینترنت را چک کنید و دوباره امتحان کنید.', 0);
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
    throw new ApiError(message || 'مشکلی پیش آمد. دوباره امتحان کنید.', res.status);
  }
  return payload as T;
}

/** برای صفحه‌های سمت سرور: اگر API در دسترس نبود صفحه نباید از کار بیفتد */
export async function safeApi<T>(path: string, fallback: T, revalidate = 60): Promise<T> {
  try {
    return await api<T>(path, { revalidate });
  } catch {
    return fallback;
  }
}

export async function upload<T = { url: string }>(path: string, files: File | File[], field = 'file'): Promise<T> {
  const form = new FormData();
  (Array.isArray(files) ? files : [files]).forEach((f) => form.append(field, f));
  const res = await fetch(apiUrl(path), { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error((Array.isArray(payload?.message) ? payload.message[0] : payload?.message) || 'آپلود انجام نشد');
  return payload as T;
}
