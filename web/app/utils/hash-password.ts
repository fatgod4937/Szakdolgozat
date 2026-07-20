export async function hashPassword(password: string) {
  const encodedPassword = new TextEncoder().encode(password);
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    encodedPassword,
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}