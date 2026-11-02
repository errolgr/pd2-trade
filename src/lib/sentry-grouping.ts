// Sentry grouping for PD2 API failures. Without it one PD2 outage becomes dozens of issues: the endpoint path carries
// per-user ids (`/game/stash/<account>`, `/market/listing/<objectId>`), transport-error messages embed the full request
// URL with `user_id=…`, and PD2ApiError groups by stack trace (one issue per call site). These helpers map such text to
// a route template so events group by route + status (or route + transport failure).

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const NUMERIC_ID = /^\d+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Path segments that follow these resources are user-specific names (account / character).
const NAME_PARAMS: Record<string, string> = { stash: ':account', account: ':account', character: ':character' };

/** `/game/stash/FadedWOES?x=1` → `/game/stash/:account`; ObjectIds / numbers / UUIDs → `:id`. Drops query and hash. */
export function normalizeEndpoint(endpoint: string): string {
  let path = endpoint.split(/[?#]/)[0];
  const origin = path.match(/^https?:\/\/[^/]+/i)?.[0] ?? '';
  path = path.slice(origin.length);
  const segments = path.split('/');
  const out = segments.map((segment, i) => {
    if (!segment) return segment;
    if (OBJECT_ID.test(segment) || NUMERIC_ID.test(segment) || UUID.test(segment)) return ':id';
    const param = NAME_PARAMS[segments[i - 1]?.toLowerCase()];
    return param ?? segment;
  });
  return origin + out.join('/');
}

const SEND_FAILURE = /^(.*?)error sending request for url \(([^)\s]+)/is;
const PD2_STATUS = /\bAPI Error: (\d{3})\b/;
const API_ERROR_TITLE = /^(\S+) (\d{3}) error on (\S+)$/;

/**
 * Fingerprint for a Sentry event's message/exception text, or undefined to keep Sentry's default grouping.
 * `exceptionType` is the first exception's type (e.g. 'PD2ApiError', 'APIError') when there is one.
 */
export function pd2Fingerprint(text: string, exceptionType?: string): string[] | undefined {
  const send = text.match(SEND_FAILURE);
  if (send) {
    const prefix = send[1].replace(/[:\s]+$/, '').trim();
    return ['network-error', prefix, normalizeEndpoint(send[2])];
  }
  const title = exceptionType === 'APIError' ? text.match(API_ERROR_TITLE) : null;
  if (title) return ['api-error', title[1], `status-${title[2]}`, normalizeEndpoint(title[3])];
  const status = text.match(PD2_STATUS)?.[1];
  if (status && (exceptionType === 'PD2ApiError' || exceptionType === undefined)) {
    return ['pd2-api-error', `status-${status}`];
  }
  return undefined;
}

/** Message text with transport-error URLs reduced to their route template (removes user ids from the title). */
export function normalizeErrorText(text: string): string {
  return text.replace(/(error sending request for url \()([^)\s]+)/gi, (_m, head: string, url: string) => head + normalizeEndpoint(url));
}
