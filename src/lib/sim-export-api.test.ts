import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch } from '@/lib/browser-http';
import { AccountMismatchError, AuthenticationError } from '@/hooks/pd2website/usePD2Website';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import {
  createSimExport,
  describeSimExportError,
  getMyCharacters,
  isSessionError,
  isSimCandidate,
  SimExportApiError,
} from './sim-export-api';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/pkce', () => ({ BACKEND_URL: 'https://backend.test' }));
vi.mock('@/hooks/pd2website/usePD2Website', () => {
  class AuthenticationError extends Error {}
  class AccountMismatchError extends Error {}
  return { AuthenticationError, AccountMismatchError };
});

const fetchMock = vi.mocked(fetch);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const item = (over: Partial<GameStashItem>): GameStashItem =>
  ({
    name: 'Harlequin Crest',
    hash: 'h1',
    is_simple: false,
    is_ear: false,
    base: { stackable: false },
    ...over,
  }) as GameStashItem;

beforeEach(() => {
  fetchMock.mockReset();
});

describe('requests', () => {
  it('lists the signed-in user’s characters with the bearer token', async () => {
    const characters = { accounts: [{ account: 'Acc', characters: ['Sorc'] }] };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, characters));
    await expect(getMyCharacters('tok')).resolves.toEqual(characters);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://backend.test/api/sim/import/mine');
    expect(init?.headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it('posts the character and the stash items as they came from PD2', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { url: 'https://pd2trader.com/sim/plan?export=x' }));
    const shako = item({});
    await expect(createSimExport('tok', 'Sorc', [shako])).resolves.toEqual({
      url: 'https://pd2trader.com/sim/plan?export=x',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://backend.test/api/sim/exports');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ Authorization: 'Bearer tok', 'Content-Type': 'application/json' });
    expect(JSON.parse(init?.body as string)).toEqual({ character: 'Sorc', stashItems: [shako] });
  });

  it('throws the server message with the status', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: 'Character "Nope" not found' }));
    const err = await createSimExport('tok', 'Nope', []).catch((e) => e);
    expect(err).toBeInstanceOf(SimExportApiError);
    expect(err).toMatchObject({ status: 404, message: 'Character "Nope" not found' });

    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 503 }));
    await expect(createSimExport('tok', 'Sorc', [])).rejects.toMatchObject({
      status: 503,
      message: 'pd2trader.com answered 503. Try again shortly.',
    });
  });
});

describe('describeSimExportError', () => {
  it('turns expired sessions, rate limits and account mismatches into user text', () => {
    expect(isSessionError(new SimExportApiError('Unauthorized', 401))).toBe(true);
    expect(isSessionError(new AuthenticationError('expired'))).toBe(true);
    expect(isSessionError(new SimExportApiError('nope', 404))).toBe(false);
    expect(describeSimExportError(new SimExportApiError('Unauthorized', 401))).toBe(
      'Your PD2 session expired. Sign in again.',
    );
    expect(describeSimExportError(new SimExportApiError('ThrottlerException', 429))).toBe(
      'Too many exports. Try again in a minute.',
    );
    expect(describeSimExportError(new AccountMismatchError('Account "X" is not yours'))).toBe(
      'Account "X" is not yours',
    );
    expect(describeSimExportError(new SimExportApiError('Character "Nope" not found', 404))).toBe(
      'Character "Nope" not found',
    );
  });
});

describe('isSimCandidate', () => {
  it('keeps gear and drops runes, gems, stackables and ears', () => {
    expect(isSimCandidate(item({}))).toBe(true);
    expect(isSimCandidate(item({ is_simple: true }))).toBe(false);
    expect(isSimCandidate(item({ is_ear: true }))).toBe(false);
    expect(isSimCandidate(item({ base: { stackable: true } as GameStashItem['base'] }))).toBe(false);
  });
});
