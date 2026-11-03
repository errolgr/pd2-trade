import { describe, expect, it } from 'vitest';
import { getPublicKeyAsync, signAsync } from '@noble/ed25519';
import { bundleStatement, canonicalJson, sha256Hex, verifyBundle, verifyEd25519 } from './verify';
import { PLUGIN_PUBLIC_KEY } from './publicKey';

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
/** Dev/test seed shared with the server's local mode (never a production key). */
const DEV_SEED = Uint8Array.from(atob('aWPRHqm93UStNrUy+qfcgxRZ3yYtyo//gdo9BzTqLXs='), (c) => c.charCodeAt(0));
const sign = async (message: string, seed = DEV_SEED) => b64(await signAsync(new TextEncoder().encode(message), seed));

describe('plugin trust', () => {
  it('the committed public key is the dev seed’s', async () => {
    expect(b64(await getPublicKeyAsync(DEV_SEED))).toBe(PLUGIN_PUBLIC_KEY);
  });

  it('accepts a correctly signed bundle', async () => {
    const bytes = new TextEncoder().encode('{"format":"pd2-plugin-bundle@1"}');
    const sha256 = await sha256Hex(bytes);
    const signature = await sign(bundleStatement('com.x.y', '1.0.0', sha256));
    expect(await verifyBundle(bytes, { id: 'com.x.y', version: '1.0.0', sha256, signature })).toEqual({ ok: true });
  });

  it('rejects tampered bytes, a signature for another version, and a foreign key', async () => {
    const bytes = new TextEncoder().encode('original');
    const sha256 = await sha256Hex(bytes);
    const signature = await sign(bundleStatement('com.x.y', '1.0.0', sha256));
    const tampered = new TextEncoder().encode('original!');
    expect(await verifyBundle(tampered, { id: 'com.x.y', version: '1.0.0', sha256, signature })).toMatchObject({
      ok: false,
      reason: 'hash-mismatch',
    });
    expect(await verifyBundle(bytes, { id: 'com.x.y', version: '1.0.1', sha256, signature })).toMatchObject({
      ok: false,
      reason: 'bad-signature',
    });
    const otherSeed = new Uint8Array(32).fill(7);
    const foreign = await sign(bundleStatement('com.x.y', '1.0.0', sha256), otherSeed);
    expect(await verifyBundle(bytes, { id: 'com.x.y', version: '1.0.0', sha256, signature: foreign })).toMatchObject({
      ok: false,
    });
    expect(await verifyEd25519('m', 'not base64!!')).toBe(false);
  });

  it('canonical JSON sorts keys at every depth and drops whitespace', () => {
    expect(canonicalJson({ issuedAt: 't', entries: [{ versions: '*', id: 'b', reason: 'r' }] })).toBe(
      '{"entries":[{"id":"b","reason":"r","versions":"*"}],"issuedAt":"t"}',
    );
  });
});
