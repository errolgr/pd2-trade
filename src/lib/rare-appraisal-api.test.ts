import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { fetchRareAppraisal, fetchRareHistory } from './rare-appraisal-api';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));

function respond(status: number, body: unknown = {}) {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

afterEach(() => {
  vi.mocked(fetch).mockReset();
});

describe('fetchRareAppraisal', () => {
  it('POSTs the clipboard text verbatim with ladder/hardcore flags and returns the parsed response', async () => {
    const body = { appraisal: null, history: null, reason: 'not a rare' };
    respond(200, body);
    const signal = new AbortController().signal;

    const result = await fetchRareAppraisal('{"quality":"Rare"}', { isLadder: false, isHardcore: true }, signal);

    expect(result).toEqual(body);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/api/rares/appraisal`);
    expect(init?.method).toBe('POST');
    expect(init?.signal).toBe(signal);
    expect(JSON.parse(init?.body as string)).toEqual({
      text: '{"quality":"Rare"}',
      isLadder: false,
      isHardcore: true,
    });
  });

  it('resolves null when the feature is off on the server (404)', async () => {
    respond(404);
    await expect(fetchRareAppraisal('x', { isLadder: true, isHardcore: false })).resolves.toBeNull();
  });

  it.each([400, 500, 503])('rejects with the status on a %i response', async (status) => {
    respond(status);
    await expect(fetchRareAppraisal('x', { isLadder: true, isHardcore: false })).rejects.toThrow(
      `Rare appraisal API error: ${status}`,
    );
  });

  it('propagates network failures', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('offline'));
    await expect(fetchRareAppraisal('x', { isLadder: true, isHardcore: false })).rejects.toThrow('offline');
  });
});

describe('fetchRareHistory', () => {
  const fp = '0123456789abcdef0123456789abcdef';

  it('strips the duplicate suffix from a fingerprint id', async () => {
    respond(200, { key: fp });
    await fetchRareHistory(`${fp}-3`);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(`${BACKEND_URL}/api/rare-history/${fp}`);
  });

  it('keeps a bare fingerprint unchanged and returns the parsed history', async () => {
    const history = { key: fp, keyType: 'fingerprint', weak: false, timesListed: 2, listings: [] };
    respond(200, history);
    await expect(fetchRareHistory(fp)).resolves.toEqual(history);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(`${BACKEND_URL}/api/rare-history/${fp}`);
  });

  it('does not strip a numeric suffix from ids that are not 32-hex fingerprints, and URL-encodes them', async () => {
    respond(200, {});
    await fetchRareHistory('Some Ring/x-2');
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(`${BACKEND_URL}/api/rare-history/Some%20Ring%2Fx-2`);
  });

  it('does not strip uppercase-hex ids (fingerprints are lowercase)', async () => {
    respond(200, {});
    const upper = fp.toUpperCase();
    await fetchRareHistory(`${upper}-2`);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(`${BACKEND_URL}/api/rare-history/${upper}-2`);
  });

  it.each([400, 404])('resolves null on %i (feature off or not a fingerprint)', async (status) => {
    respond(status);
    await expect(fetchRareHistory(fp)).resolves.toBeNull();
  });

  it('rejects on server errors', async () => {
    respond(500);
    await expect(fetchRareHistory(fp)).rejects.toThrow('Rare history API error: 500');
  });
});
