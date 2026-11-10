import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch } from '@/lib/browser-http';
import { BuildsApiError, suggestBuilds } from './builds-api';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  vi.mocked(fetch).mockReset();
});

describe('suggestBuilds', () => {
  it('sends the query and keeps valid entries, dropping malformed ones', async () => {
    vi.mocked(fetch).mockResolvedValue(
      json({
        characters: [
          { name: 'Hammy', account: 'Bob', className: 'Paladin', level: 97, isHardcore: true, matchedOn: 'name' },
          { name: 'NoAccount', account: null, className: 'Sorceress', level: 90, isHardcore: false, matchedOn: 'x' },
          { name: 'NoLevel', account: 'Bob', className: 'Paladin', isHardcore: false, matchedOn: 'name' },
          { account: 'Bob', className: 'Paladin', level: 90 },
          'junk',
        ],
        accounts: [{ account: 'Bob', characters: 3 }, { account: 'Dave' }, { characters: 2 }, null],
      }),
    );

    const result = await suggestBuilds('ham', { limit: 5, mode: 'hardcore' });

    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(url.pathname).toBe('/api/builds/suggest');
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'ham', limit: '5', mode: 'hardcore' });
    expect(result).toEqual({
      characters: [
        { name: 'Hammy', account: 'Bob', className: 'Paladin', level: 97, isHardcore: true, matchedOn: 'name' },
        { name: 'NoAccount', account: null, className: 'Sorceress', level: 90, isHardcore: false, matchedOn: 'name' },
      ],
      accounts: [
        { account: 'Bob', characters: 3 },
        { account: 'Dave', characters: 0 },
      ],
    });
  });

  it('answers empty lists for a body without them', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ characters: 'nope' }));
    await expect(suggestBuilds('ham', { limit: 5 })).resolves.toEqual({ characters: [], accounts: [] });
  });

  it('rejects with the HTTP status when the server fails', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ message: 'search backend down' }, 503));
    const error = await suggestBuilds('ham', { limit: 5 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BuildsApiError);
    expect(error).toMatchObject({ status: 503, message: 'search backend down' });
  });
});
