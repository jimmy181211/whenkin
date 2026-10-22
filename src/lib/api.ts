export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(12000),
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new ApiError('We couldn’t reach Whenkin. Please check your connection and try again.', 0);
  }
  const body: unknown = await response.json().catch(()=>null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError('Event saving is not available at this address yet. Please try again once setup is complete.', response.status);
  }
  if (!response.ok) throw new ApiError('error' in body && typeof body.error === 'string' ? body.error : 'Something went wrong. Please try again.', response.status);
  return body as T;
}
export function loadSecret(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
export function saveSecret(key: string, value: string) { try { localStorage.setItem(key, value); return true; } catch { return false; } }
