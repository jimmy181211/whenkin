export type ResponseIdentity = { id: string; token: string };

function responseIdentity(value: unknown): ResponseIdentity | null {
  if (!value || typeof value !== 'object') return null;
  const { id, token } = value as Record<string, unknown>;
  return typeof id === 'string' && id.length > 0 && typeof token === 'string' && token.length > 0 ? { id, token } : null;
}

// Shared links restore only this person's response-edit identity.
export function readEventAccess(fragment: string, storedResponse: string | null) {
  const params = new URLSearchParams(fragment.replace(/^#/, ''));
  let response: ResponseIdentity | null = null;
  const edit = params.get('edit');
  if (edit) {
    const [id, token] = edit.split('.');
    response = responseIdentity({ id, token });
  } else {
    try { response = responseIdentity(JSON.parse(storedResponse || 'null')); } catch { /* Ignore invalid saved credentials. */ }
  }
  return { response };
}
