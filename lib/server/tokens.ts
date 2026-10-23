export async function hash(value: string) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export function token() {
    return crypto.randomUUID() + crypto.randomUUID();
}
