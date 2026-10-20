import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportApiError } from '@/lib/error-reporting';
import {
  API_BASE_URL,
  fetchCorruptionPrices,
  fetchItemPrice,
  fetchItemPriceByName,
  fetchMultipleItemPrices,
  fetchPriceHistory,
} from './price-api';

vi.mock('@/lib/error-reporting', () => ({ reportApiError: vi.fn() }));

const fetchMock = vi.fn<typeof fetch>();
const report = vi.mocked(reportApiError);

function jsonResponse(status: number, body: unknown, statusText = ''): Response {
  return new Response(JSON.stringify(body), { status, statusText });
}

function lastUrl(): URL {
  return new URL(String(fetchMock.mock.calls.at(-1)![0]));
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  report.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const price = (baseCode: string, medianPrice = 1) => ({ baseCode, itemName: baseCode, medianPrice });

describe('fetchItemPrice', () => {
  it('queries the average endpoint with only the provided options', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, price('r30', 1)));
    await expect(fetchItemPrice('r30', { isLadder: false, hours: 168 })).resolves.toEqual(price('r30', 1));
    const url = lastUrl();
    expect(url.origin + url.pathname).toBe(`${API_BASE_URL}/item-prices/average`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ baseCode: 'r30', isLadder: 'false', hours: '168' });
  });

  it('returns null without reporting when the item has no data (404)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, {}));
    await expect(fetchItemPrice('zzz')).resolves.toBeNull();
    expect(report).not.toHaveBeenCalled();
  });

  it('returns null and reports server errors with their status', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, {}, 'Internal Server Error'));
    await expect(fetchItemPrice('r30')).resolves.toBeNull();
    expect(report).toHaveBeenCalledTimes(1);
    const [err, , endpoint, status, extra] = report.mock.calls[0];
    expect(err.message).toBe('API error: 500 Internal Server Error');
    expect([endpoint, status, extra]).toEqual(['item-prices/average', 500, { baseCode: 'r30' }]);
  });

  it('returns null and reports network failures, wrapping non-Error throws', async () => {
    fetchMock.mockRejectedValue('offline');
    await expect(fetchItemPrice('r30')).resolves.toBeNull();
    const [err, , , status] = report.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('offline');
    expect(status).toBeUndefined();
  });

  it('returns null when the body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('not json', { status: 200 }));
    await expect(fetchItemPrice('r30')).resolves.toBeNull();
    expect(report).toHaveBeenCalledTimes(1);
  });
});

describe('fetchItemPriceByName', () => {
  it('sends the rolling window when the season is current (no end date)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, price('uap', 2)));
    await fetchItemPriceByName("Harlequin's Crest", {
      isLadder: true,
      isHardcore: false,
      startDate: '2026-04-23',
      hours: 72,
    });
    expect(Object.fromEntries(lastUrl().searchParams)).toEqual({
      itemName: "Harlequin's Crest",
      isLadder: 'true',
      isHardcore: 'false',
      startDate: '2026-04-23',
      hours: '72',
    });
  });

  it('drops the rolling window for a past season with an end date', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, price('uap', 2)));
    await fetchItemPriceByName('Shako', { startDate: '2025-10-25', endDate: '2026-04-22', hours: 72 });
    const params = lastUrl().searchParams;
    expect(params.get('endDate')).toBe('2026-04-22');
    expect(params.has('hours')).toBe(false);
  });

  it('returns null on 404 silently and on other errors with a report', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, {}));
    await expect(fetchItemPriceByName('Shako')).resolves.toBeNull();
    expect(report).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(jsonResponse(503, {}, 'Unavailable'));
    await expect(fetchItemPriceByName('Shako')).resolves.toBeNull();
    expect(report.mock.calls[0][3]).toBe(503);
    expect(report.mock.calls[0][4]).toEqual({ itemName: 'Shako' });

    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(fetchItemPriceByName('Shako')).resolves.toBeNull();
    expect(report.mock.calls[1][0].message).toBe('timeout');
  });
});

describe('fetchMultipleItemPrices', () => {
  it('does not hit the network for an empty list', async () => {
    const result = await fetchMultipleItemPrices([]);
    expect(result?.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts all base codes in one request and keys results by baseCode', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [price('r31', 2), price('r30', 1)] }));
    const result = await fetchMultipleItemPrices([{ baseCode: 'r30' }, { baseCode: 'r31' }, { baseCode: 'r33' }], {
      isLadder: true,
      hours: 24,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/item-prices/average/batch`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ baseCodes: ['r30', 'r31', 'r33'], isLadder: true, hours: 24 });

    expect(result!.get('r30')?.medianPrice).toBe(1);
    expect(result!.get('r31')?.medianPrice).toBe(2);
    expect(result!.has('r33')).toBe(false);
  });

  it('returns null for a malformed batch body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: 'nope' }));
    expect(await fetchMultipleItemPrices([{ baseCode: 'r30' }])).toBeNull();
    expect(report).not.toHaveBeenCalled();
  });

  it('returns null and reports on HTTP and network errors (no per-item fallback)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, {}, 'err'));
    expect(await fetchMultipleItemPrices([{ baseCode: 'r30' }, { baseCode: 'r31' }])).toBeNull();
    expect(report.mock.calls[0][2]).toBe('item-prices/average/batch');
    expect(report.mock.calls[0][3]).toBe(500);

    fetchMock.mockRejectedValueOnce(new Error('down'));
    expect(await fetchMultipleItemPrices([{ baseCode: 'r30' }])).toBeNull();
    expect(report).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('fetchCorruptionPrices', () => {
  it('queries by item name and/or base code, without the window when an end date is set', async () => {
    const body = { itemName: 'Shako', baseCode: 'uap', typeCode: 'helm', corruptionPrices: [] };
    fetchMock.mockResolvedValue(jsonResponse(200, body));
    await expect(
      fetchCorruptionPrices({ itemName: 'Shako' }, { isHardcore: true, endDate: '2026-04-22', hours: 24 }),
    ).resolves.toEqual(body);
    const url = lastUrl();
    expect(url.pathname).toBe('/item-prices/corruption-prices');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      itemName: 'Shako',
      isHardcore: 'true',
      endDate: '2026-04-22',
    });

    await fetchCorruptionPrices({ baseCode: 'uap' }, { hours: 24 });
    expect(Object.fromEntries(lastUrl().searchParams)).toEqual({ baseCode: 'uap', hours: '24' });
  });

  it('returns null on 404 silently and on errors with a report carrying the lookup params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, {}));
    await expect(fetchCorruptionPrices({ baseCode: 'uap' })).resolves.toBeNull();
    expect(report).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(jsonResponse(500, {}, 'err'));
    await expect(fetchCorruptionPrices({ baseCode: 'uap' })).resolves.toBeNull();
    expect(report.mock.calls[0][4]).toEqual({ baseCode: 'uap' });

    fetchMock.mockRejectedValueOnce(new Error('down'));
    await expect(fetchCorruptionPrices({ itemName: 'Shako' })).resolves.toBeNull();
    expect(report.mock.calls[1][4]).toEqual({ itemName: 'Shako' });
  });
});

describe('fetchPriceHistory', () => {
  it('escapes the base code in the path and sends mode flags plus optional range', async () => {
    const body = { baseCode: 'rainbow facet', dayCount: 0, data: [] };
    fetchMock.mockResolvedValue(jsonResponse(200, body));
    await expect(
      fetchPriceHistory('rainbow facet/x', { isLadder: true, isHardcore: false, startDate: '2026-04-23', limit: 30 }),
    ).resolves.toEqual(body);
    const url = lastUrl();
    expect(url.pathname).toBe('/item-prices/history/rainbow%20facet%2Fx');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      isLadder: 'true',
      isHardcore: 'false',
      limit: '30',
      startDate: '2026-04-23',
    });
  });

  it('returns null without reporting on 404, with a report on other failures', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, {}));
    await expect(fetchPriceHistory('r30', { isLadder: true, isHardcore: false })).resolves.toBeNull();
    expect(report).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(jsonResponse(502, {}, 'Bad Gateway'));
    await expect(fetchPriceHistory('r30', { isLadder: true, isHardcore: false })).resolves.toBeNull();
    expect(report.mock.calls[0][0].message).toBe('API error: 502 Bad Gateway');

    fetchMock.mockRejectedValueOnce(new Error('down'));
    await expect(fetchPriceHistory('r30', { isLadder: true, isHardcore: false })).resolves.toBeNull();
    expect(report).toHaveBeenCalledTimes(2);
  });
});
