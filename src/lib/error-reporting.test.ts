import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import { AccountMismatchError } from '@/hooks/pd2website/usePD2Website';
import { reportApiError } from './error-reporting';

interface FakeScope {
  fingerprint: string[];
  tags: Record<string, string>;
  contexts: Record<string, unknown>;
  setFingerprint: (f: string[]) => void;
  setTag: (k: string, v: string) => void;
  setContext: (k: string, v: unknown) => void;
}

vi.mock('@sentry/react', () => ({ withScope: vi.fn(), captureException: vi.fn() }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({
  AccountMismatchError: class AccountMismatchError extends Error {},
}));

let scope: FakeScope;

beforeEach(() => {
  scope = {
    fingerprint: [],
    tags: {},
    contexts: {},
    setFingerprint(f) {
      this.fingerprint = f;
    },
    setTag(k, v) {
      this.tags[k] = v;
    },
    setContext(k, v) {
      this.contexts[k] = v;
    },
  };
  vi.mocked(Sentry.withScope).mockImplementation(((cb: (s: FakeScope) => void) => cb(scope)) as never);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function captured() {
  const [error, hint] = vi.mocked(Sentry.captureException).mock.calls[0];
  if (!(error instanceof Error) || !hint || typeof hint !== 'object' || !('extra' in hint)) {
    throw new Error('captureException was not called with (Error, { extra })');
  }
  return { error, extra: hint.extra };
}

describe('reportApiError → Sentry', () => {
  it('reports 5xx errors grouped by service, status and endpoint, not by request details', () => {
    const original = new Error('API error: 503 Service Unavailable for item=Shako');

    reportApiError(original, 'price-api', '/item-prices/average', undefined, { itemName: 'Shako' });

    expect(scope.fingerprint).toEqual(['api-error', 'price-api', 'status-503', '/item-prices/average']);
    const { error, extra } = captured();
    expect(error.name).toBe('APIError');
    expect(error.message).toBe('price-api 503 error on /item-prices/average');
    expect(error.stack).toBe(original.stack);
    expect(extra).toMatchObject({
      originalError: original.message,
      service: 'price-api',
      endpoint: '/item-prices/average',
      statusCode: '503',
      itemName: 'Shako',
    });
  });

  it.each([
    ['explicit 4xx status', new Error('whatever'), 404],
    ['4xx parsed from message', new Error('API Error: 429'), undefined],
    ['no status at all', new Error('network down'), undefined],
  ])('does not report %s', (_case, error, status) => {
    reportApiError(error, 'svc', '/x', status);

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('prefers the explicit status code over one in the message', () => {
    reportApiError(new Error('API error: 404'), 'svc', '/x', 502);

    expect(scope.tags.status_code).toBe('502');
  });

  it('parses the status case-insensitively from the message', () => {
    reportApiError(new Error('api ERROR: 500'), 'svc', '/x');

    expect(scope.tags.status_code).toBe('500');
  });

  it('tags context values as strings and drops null/undefined from tags and context', () => {
    reportApiError(new Error('x'), 'svc', '/x', 500, { count: 3, ok: false, gone: null, missing: undefined });

    expect(scope.tags).toMatchObject({
      error_type: 'api_error',
      service: 'svc',
      endpoint: '/x',
      count: '3',
      ok: 'false',
    });
    expect('gone' in scope.tags || 'missing' in scope.tags).toBe(false);
    expect(scope.contexts.request_context).toEqual({ count: 3, ok: false });
  });

  it('omits request_context when there is no additional context', () => {
    reportApiError(new Error('x'), 'svc', '/x', 500, {});

    expect(scope.contexts).toEqual({});
  });

  it('never reports AccountMismatchError (expected user error), nor logs it', () => {
    reportApiError(new AccountMismatchError('wrong account'), 'svc', '/x', 500);

    expect(Sentry.withScope).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('reportApiError → console', () => {
  it('logs with a context prefix outside production, skipping empty values', () => {
    const error = new Error('API error: 404');

    reportApiError(error, 'svc', '/items', undefined, { item: 'Jah', page: 2, none: null });

    expect(console.error).toHaveBeenCalledWith('[item: Jah, page: 2] Error on /items:', error);
  });

  it('logs without a prefix when there is no context', () => {
    const error = new Error('x');

    reportApiError(error, 'svc', '/items');

    expect(console.error).toHaveBeenCalledWith('Error on /items:', error);
  });

  it('stays silent in production (Sentry captures console.error there)', () => {
    vi.stubEnv('NODE_ENV', 'production');

    reportApiError(new Error('API error: 500'), 'svc', '/items');

    expect(console.error).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
