/** Short unique id. crypto.randomUUID needs a secure context — GitHub Pages is
    HTTPS, but the fallback keeps `file://` and plain-http testing working. */
export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}
