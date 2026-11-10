import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch } from '@/lib/browser-http';
import { CARD_UNSUPPORTED, getSimReportCard, reportSlug, SimJobsApiError } from './sim-jobs-api';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/pkce', () => ({ BACKEND_URL: 'https://backend.test' }));

const fetchMock = vi.mocked(fetch);
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  fetchMock.mockReset();
});

describe('reportSlug', () => {
  it('reads the slug of a report link, and nothing else', () => {
    expect(reportSlug('https://pd2trader.com/sim/r/ab%20c')).toBe('ab c');
    expect(reportSlug('https://pd2trader.com/sim/r/abc/')).toBe('abc');
    expect(reportSlug('https://pd2trader.com/sim/plan?import=X')).toBeNull();
    expect(reportSlug('https://pd2trader.com/sim/r/abc/timeline')).toBeNull();
    expect(reportSlug('not a url')).toBeNull();
    expect(reportSlug(null)).toBeNull();
  });
});

describe('getSimReportCard', () => {
  it('asks for the card with the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { slug: 'a b' }));
    await expect(getSimReportCard('tok', 'a b')).resolves.toEqual({ slug: 'a b' });
    expect(fetchMock).toHaveBeenCalledWith('https://backend.test/api/sim/reports/a%20b/card', {
      headers: { Authorization: 'Bearer tok' },
      signal: undefined,
    });
  });

  it('tells a report without a card from other failures', async () => {
    fetchMock.mockResolvedValueOnce(json(404, { code: 'card_unsupported' }));
    await expect(getSimReportCard('tok', 'cmp')).rejects.toMatchObject({ message: CARD_UNSUPPORTED, status: 404 });
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 500 }));
    const error = await getSimReportCard('tok', 'x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SimJobsApiError);
    expect((error as SimJobsApiError).message).not.toBe(CARD_UNSUPPORTED);
  });
});
