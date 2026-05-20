// Address normalizers used for both ingestion and cross-source dedup.

export function normalizeEmail(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  // very loose validity check — we'd rather keep a slightly-malformed address
  // than drop a real contact
  if (!s.includes('@') || s.length < 5) return null;
  return s;
}

// Returns E.164 (+1XXXXXXXXXX) for North American numbers, or null if we can't
// confidently produce one. Strips extensions, country-code prefixes, and any
// non-digit punctuation.
export function normalizePhone(raw) {
  if (!raw) return null;
  let s = String(raw);
  // strip extension markers and everything after
  s = s.split(/\b(?:ext|x|#)\b/i)[0];
  const digits = s.replace(/\D+/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  // already has a plus or is non-NANP and we don't trust ourselves to canonicalize
  if (String(raw).trim().startsWith('+') && digits.length >= 8) return `+${digits}`;
  return null;
}

export function normalizeLinkedInUrl(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // strip query string and fragment
  s = s.split('?')[0].split('#')[0];
  // strip trailing slash
  s = s.replace(/\/+$/, '');
  // force lowercase
  s = s.toLowerCase();
  // require it actually look like a LinkedIn profile URL
  if (!/linkedin\.com\/in\//.test(s)) return null;
  return s;
}
