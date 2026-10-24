export type ResponseIdentity = { id: string; token: string };

// Only an explicit private URL restores a person. Shared URLs always start blank.
export function readEventAccess(fragment: string): { response: ResponseIdentity | null } {
  const edit = new URLSearchParams(fragment.replace(/^#/, '')).get('edit');
  const parts = edit?.split('.');
  const response = parts?.length === 2 && parts[0] && parts[1]
    ? { id: parts[0], token: parts[1] } : null;
  return { response };
}
