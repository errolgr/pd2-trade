/**
 * Product telemetry backed by Grafana Faro.
 *
 * - Discrete occurrences (clicks, auto-selections, ...) are Faro events.
 * - Operations that carry numbers (durations, item counts, prices) are Faro measurements; one
 *   measurement per operation, so counting measurements of a type counts the operation.
 *
 * Naming: event names and measurement types are snake_case; measurement value keys carry their unit
 * (`duration_ms`, `*_items`, `price_hr`, `*_chars`). Attributes/context must stay low-cardinality:
 * never put user ids, account names, item names, URLs or free text in them.
 *
 * Before Faro is initialized (or when VITE_FARO_URL is unset) `faro.api` is a no-op, so every helper
 * here is safe to call unconditionally.
 */
import { faro, type MetaUser } from '@grafana/faro-web-sdk';

export type TelemetryAttributes = Record<string, string | number | boolean | null | undefined>;

function toStringRecord(attributes?: TelemetryAttributes): Record<string, string> | undefined {
  if (!attributes) return undefined;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== null && value !== undefined) {
      result[key] = String(value);
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Record a discrete occurrence, e.g. `trackEvent('list_item_auto_selected')`.
 */
export function trackEvent(name: string, attributes?: TelemetryAttributes): void {
  faro.api.pushEvent(name, toStringRecord(attributes));
}

/**
 * Record an operation with numeric values, e.g.
 * `trackMeasurement('listed_items_fetch', { duration_ms: 120, returned_items: 20 }, { outcome: 'success' })`.
 * Non-finite or missing values are dropped; nothing is sent when no value remains.
 */
export function trackMeasurement(
  type: string,
  values: Record<string, number | null | undefined>,
  context?: TelemetryAttributes,
): void {
  const numericValues: Record<string, number> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      numericValues[key] = value;
    }
  }
  if (Object.keys(numericValues).length === 0) return;

  const stringContext = toStringRecord(context);
  faro.api.pushMeasurement({ type, values: numericValues }, stringContext ? { context: stringContext } : undefined);
}

/**
 * Attach (or clear with `null`) the signed-in PD2 user to every subsequent signal of this window.
 */
export function setTelemetryUser(user: Pick<MetaUser, 'id' | 'username' | 'attributes'> | null): void {
  if (user) {
    faro.api.setUser(user);
  } else {
    faro.api.resetUser();
  }
}
