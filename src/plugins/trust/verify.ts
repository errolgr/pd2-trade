import { verifyAsync } from '@noble/ed25519';
import { PLUGIN_PUBLIC_KEY } from './publicKey';

/**
 * Bundle and blocklist trust (PRD §7.3). WebCrypto Ed25519 needs Chromium 137+, and WebView2 runtimes as old as
 * 112 are in the field, so signatures are checked with @noble/ed25519 (its async verify hashes with WebCrypto
 * SHA-512, available everywhere we run). SHA-256 is WebCrypto.
 */

const encoder = new TextEncoder();

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string' ? encoder.encode(data) : data;
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Ed25519 over the UTF-8 message; false (never throws) for malformed signatures or keys. */
export async function verifyEd25519(
  message: string,
  signatureBase64: string,
  publicKeyBase64: string = PLUGIN_PUBLIC_KEY,
): Promise<boolean> {
  try {
    const signature = base64ToBytes(signatureBase64);
    const publicKey = base64ToBytes(publicKeyBase64);
    if (signature.length !== 64 || publicKey.length !== 32) return false;
    return await verifyAsync(signature, encoder.encode(message), publicKey);
  } catch {
    return false;
  }
}

/** The signed statement for one published bundle: `${id}@${version}:${sha256}`. */
export const bundleStatement = (id: string, version: string, sha256: string) => `${id}@${version}:${sha256}`;

export interface BundleCheck {
  ok: boolean;
  reason?: 'hash-mismatch' | 'bad-signature';
}

/** Verifies the downloaded bytes hash to `sha256` and the server signed `${id}@${version}:${sha256}`. */
export async function verifyBundle(
  bytes: Uint8Array,
  expected: { id: string; version: string; sha256: string; signature: string },
  publicKeyBase64?: string,
): Promise<BundleCheck> {
  const actual = await sha256Hex(bytes);
  if (actual !== expected.sha256.toLowerCase()) return { ok: false, reason: 'hash-mismatch' };
  const signed = await verifyEd25519(
    bundleStatement(expected.id, expected.version, actual),
    expected.signature,
    publicKeyBase64,
  );
  return signed ? { ok: true } : { ok: false, reason: 'bad-signature' };
}

/** JSON.stringify with object keys sorted at every depth, arrays in order, no whitespace (server-identical). */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}
