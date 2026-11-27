/**
 * The canonical normalization for quoted annotation text comparison.
 *
 * Two users selecting the same sentence can capture different whitespace
 * (a paragraph break vs a space, a stray double space), so raw `exact`
 * values must never be compared for "same passage" equality. This function
 * defines the single comparison key used across the codebase:
 *
 *   collapse every whitespace run to a single space, then trim the ends.
 *
 * It is implemented once here on purpose (shared by server modules, the
 * webapp and the extension). The persistence layer stores the normalized
 * form (`exact_normalized` on annotation_selectors) computed by this
 * function at write time, so matching queries compare plain equality on
 * that column — no SQL-side normalization that could drift from this rule.
 *
 * Note: JS `\s` matches some characters (e.g. NBSP, U+2028) that other
 * environments' whitespace classes may not. Any other implementation of
 * this rule must match JS `\s` semantics exactly, or normalization should
 * be redefined with an explicit character list before divergence occurs.
 */
export function normalizeQuotedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Map key for a passage: (url, exact_normalized) joined with a newline so
 * url+passage concatenation can never alias. Shared by the query services
 * that group annotation cards by passage and the callers that look results
 * up again.
 */
export function annotationPassageKey(
  url: string,
  exactNormalized: string,
): string {
  return `${url}\n${exactNormalized}`;
}

/**
 * Canonical URL form for passage identity — mirrors the domain URL value
 * object's create() rule exactly: trim, and append a trailing slash only to
 * truly bare root URLs (no path, no query, no fragment). Idempotent, so it
 * is safe to call on already-canonical server-side values.
 */
export function canonicalizeAnnotationUrl(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (
      (parsed.pathname === '' || parsed.pathname === '/') &&
      parsed.search === '' &&
      parsed.hash === '' &&
      !trimmed.endsWith('/')
    ) {
      return trimmed + '/';
    }
  } catch {
    // Not parseable — hash the trimmed value as-is
  }
  return trimmed;
}

/**
 * Stable content ID (CID) for an annotation passage.
 *
 * One CID per distinct passage per URL, shared across every user/card that
 * annotates it — the same identity used for the vector DB id, the persisted
 * annotation_selectors.annotation_cid column, and the /annotation/{cid} page
 * route. The hash input is the canonical URL and the *stored*
 * `exact_normalized` value (produced by normalizeQuotedText), joined with a
 * newline to prevent concatenation ambiguity.
 *
 * Format: first 12 bytes (96 bits) of sha256, base36-encoded via BigInt —
 * 18–19 lowercase alphanumeric chars. Synchronous and dependency-free so
 * the webapp and extension can compute it with no server round-trip.
 */
export function computeAnnotationCID(url: string, exact: string): string {
  const input = `${canonicalizeAnnotationUrl(url)}\n${normalizeQuotedText(exact)}`;
  const digest = sha256(new TextEncoder().encode(input));
  const view = new DataView(digest.buffer, digest.byteOffset, 12);
  const value =
    (BigInt(view.getUint32(0)) << 64n) |
    (BigInt(view.getUint32(4)) << 32n) |
    BigInt(view.getUint32(8));
  return value.toString(36);
}

// Round constants and initial hash values from FIPS 180-4
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/**
 * Minimal sync sha256 for CID derivation. Node's crypto and Web Crypto's
 * subtle are both unavailable here (the types package must stay isomorphic
 * and sync — CIDs are computed during render for href building), so this is
 * a straightforward FIPS 180-4 implementation. Verified against known
 * vectors in the unit tests; only used for hashing, never security.
 */
function sha256(message: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);

  // Padded message: data + 0x80 + zeros + 64-bit big-endian bit length
  const bitLength = message.length * 8;
  const paddedLength = Math.ceil((message.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const w = new Uint32Array(64);
  for (let block = 0; block < paddedLength; block += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = view.getUint32(block + t * 4);
    }
    for (let t = 16; t < 64; t++) {
      const w15 = w[t - 15]!;
      const w2 = w[t - 2]!;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      w[t] = (w[t - 16]! + s0 + w[t - 7]! + s1) >>> 0;
    }

    let a = h[0]!;
    let b = h[1]!;
    let c = h[2]!;
    let d = h[3]!;
    let e = h[4]!;
    let f = h[5]!;
    let g = h[6]!;
    let hh = h[7]!;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + SHA256_K[t]! + w[t]!) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0]! + a) >>> 0;
    h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0;
    h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0;
    h[5] = (h[5]! + f) >>> 0;
    h[6] = (h[6]! + g) >>> 0;
    h[7] = (h[7]! + hh) >>> 0;
  }

  const digest = new Uint8Array(32);
  const digestView = new DataView(digest.buffer);
  for (let i = 0; i < 8; i++) {
    digestView.setUint32(i * 4, h[i]!);
  }
  return digest;
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}
