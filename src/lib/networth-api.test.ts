import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch } from '@/lib/browser-http';
import {
  deleteHistory,
  getDiff,
  getPoints,
  getSeasons,
  getSessions,
  getSnapshot,
  getStanding,
  NetWorthApiError,
  postSessionMarker,
  syncSnapshot,
  updateProfileSettings,
  type NetWorthOwner,
} from './networth-api';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/pkce', () => ({ BACKEND_URL: 'https://backend.test' }));

const fetchMock = vi.mocked(fetch);
const owner: NetWorthOwner = { account: 'My Acc&1', isLadder: true, isHardcore: false };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function lastCall(): { url: URL; init: RequestInit & { headers: Record<string, string> } } {
  const [input, init] = fetchMock.mock.calls.at(-1)!;
  return { url: new URL(String(input)), init: init as RequestInit & { headers: Record<string, string> } };
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => jsonResponse(200, { ok: true }));
});

describe('request headers', () => {
  it('sends a bearer token on authenticated GETs without a JSON content type', async () => {
    await getSessions('tok', owner);
    const { url, init } = lastCall();
    expect(url.origin + url.pathname).toBe('https://backend.test/api/networth/sessions');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('sends no Authorization header on the public seasons endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { seasons: [], currentId: 's13' }));
    await expect(getSeasons()).resolves.toEqual({ seasons: [], currentId: 's13' });
    const { url, init } = lastCall();
    expect(url.pathname).toBe('/api/seasons');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('marks bodies as JSON on POST/PUT', async () => {
    await syncSnapshot('tok', owner, 'manual', true);
    let { init } = lastCall();
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ ...owner, trigger: 'manual', persist: true });

    await updateProfileSettings('tok', { optedIn: true, displayName: 'Me' });
    ({ init } = lastCall());
    expect(init.method).toBe('PUT');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ optedIn: true, displayName: 'Me' });
  });

  it('posts session markers with the owner and marker type', async () => {
    await postSessionMarker('tok', owner, 'stop');
    const { url, init } = lastCall();
    expect(url.pathname).toBe('/api/networth/sessions/markers');
    expect(JSON.parse(init.body as string)).toEqual({ ...owner, type: 'stop' });
  });
});

describe('owner query strings', () => {
  it('encodes the owner and mode flags and drops undefined options', async () => {
    await getPoints('tok', owner, { seasonId: 's13', resolution: 'day', from: undefined });
    const { url } = lastCall();
    expect(Object.fromEntries(url.searchParams)).toEqual({
      account: 'My Acc&1',
      isLadder: 'true',
      isHardcore: 'false',
      seasonId: 's13',
      resolution: 'day',
    });
  });

  it('defaults the diff price basis to "then"', async () => {
    await getDiff('tok', owner, 'snapA', 'snapB');
    expect(Object.fromEntries(lastCall().url.searchParams)).toMatchObject({
      from: 'snapA',
      to: 'snapB',
      priceBasis: 'then',
    });
    await getDiff('tok', owner, 'snapA', 'snapB', 'now');
    expect(lastCall().url.searchParams.get('priceBasis')).toBe('now');
  });

  it('omits seasonId when deleting all history, and uses DELETE', async () => {
    await deleteHistory('tok', owner);
    const { url, init } = lastCall();
    expect(url.pathname).toBe('/api/networth');
    expect(url.searchParams.has('seasonId')).toBe(false);
    expect(init.method).toBe('DELETE');
  });

  it('escapes snapshot ids in the path', async () => {
    await getSnapshot('tok', 'a/b c');
    expect(String(fetchMock.mock.calls.at(-1)![0])).toBe('https://backend.test/api/networth/snapshots/a%2Fb%20c');
  });

  it('sends standing mode flags and only a non-empty seasonId', async () => {
    await getStanding('tok', { isLadder: false, isHardcore: true });
    expect(Object.fromEntries(lastCall().url.searchParams)).toEqual({ isLadder: 'false', isHardcore: 'true' });
    await getStanding('tok', { isLadder: false, isHardcore: true }, 's12');
    expect(lastCall().url.searchParams.get('seasonId')).toBe('s12');
  });
});

describe('error handling', () => {
  it('throws NetWorthApiError with the status and the server message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { message: 'Account not linked' }));
    const err = await getSessions('tok', owner).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NetWorthApiError);
    expect(err).toMatchObject({ status: 403, message: 'Account not linked', name: 'NetWorthApiError' });
  });

  it('joins validation message arrays', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { message: ['account must be a string', 'isLadder required'] }));
    await expect(getPoints('tok', owner)).rejects.toMatchObject({
      status: 400,
      message: 'account must be a string, isLadder required',
    });
  });

  it('falls back to a generic message for non-JSON or message-less error bodies', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(getSeasons()).rejects.toMatchObject({ status: 502, message: 'Net worth API 502' });

    fetchMock.mockResolvedValue(jsonResponse(500, { error: 'boom' }));
    await expect(getSeasons()).rejects.toMatchObject({ status: 500, message: 'Net worth API 500' });
  });

  it('propagates network failures unchanged', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(getSeasons()).rejects.toThrow(TypeError);
  });
});
