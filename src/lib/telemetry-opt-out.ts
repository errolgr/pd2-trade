/**
 * The `telemetryOptOut` setting for Sentry (errors, traces, session replay) and Grafana Faro (metrics/events).
 *
 * At startup main.tsx calls initTelemetryFromSettings(), which reads settings.json directly (OptionsProvider
 * hasn't loaded it yet) and starts nothing when the user opted out. Toggle changes afterwards are applied by
 * OptionsProvider through applyTelemetryOptOut().
 */
import * as Sentry from '@sentry/react';
import { faro } from '@grafana/faro-web-sdk';
import { BaseDirectory, readTextFile } from '@/lib/browser-fs';
import { initFaro } from '@/lib/faro';
import { initSentry, isSentryEnabledForBuild } from '@/lib/sentry';

// Sentry is initialized after a delay so it does not block application startup
const SENTRY_INIT_DELAY_MS = 1000;

let enabled = false;
let sentryInitTimer: ReturnType<typeof setTimeout> | undefined;

// Until initializeFaro() runs (or forever without VITE_FARO_URL), `faro` is a placeholder without pause/unpause
const faroRunning = () => 'pause' in faro;

function start(): void {
  if (faroRunning()) faro.unpause();
  else initFaro();

  const client = Sentry.getClient();
  if (!client) {
    sentryInitTimer = setTimeout(initSentry, SENTRY_INIT_DELAY_MS);
    return;
  }
  // Back on after an opt-out this session: undo stop() on the existing client
  client.getOptions().enabled = isSentryEnabledForBuild();
  // Error-triggered replays only; the 10% full-session sample is not re-rolled until the next launch
  Sentry.getReplay()?.startBuffering();
}

function stop(): void {
  clearTimeout(sentryInitTimer);
  if (faroRunning()) faro.pause();
  // Replay uploads go straight to the transport, bypassing the client's `enabled` check
  void Sentry.getReplay()?.stop();
  const client = Sentry.getClient();
  if (client) client.getOptions().enabled = false;
}

export function applyTelemetryOptOut(optOut: boolean): void {
  if (enabled === !optOut) return;
  enabled = !optOut;
  if (enabled) start();
  else stop();
}

export async function initTelemetryFromSettings(): Promise<void> {
  let optOut = false;
  try {
    const raw = await readTextFile('settings.json', { baseDir: BaseDirectory.AppConfig });
    optOut = JSON.parse(raw).telemetryOptOut === true;
  } catch {
    // Settings file doesn't exist yet or parse error: not opted out
  }
  applyTelemetryOptOut(optOut);
}
