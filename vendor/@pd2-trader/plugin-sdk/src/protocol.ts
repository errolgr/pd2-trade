import type { PluginManifest } from './manifest';
import type { CallableSlotId, EventName } from './slots';

/**
 * Host <-> plugin RPC over the plugin's MessageChannel. Plugins never speak this directly: the worker client
 * (`sdk`) and the panel bridge (`window.pd2`) wrap it. Versioned with the SDK major.
 */

/** Broker methods and the permission each needs (see host broker). */
export const BROKER_METHODS = [
  'storage.get',
  'storage.set',
  'storage.remove',
  'storage.keys',
  'fetch',
  'prices.runes',
  'prices.item',
  'prices.mode',
  'notify',
  'settings.get',
  'account.profile',
  'stash.summary',
  'panels.open',
  'panels.post',
  'log',
] as const;
export type BrokerMethod = (typeof BROKER_METHODS)[number];

/** Reply to a call: `value` when ok, `error` (message) otherwise. */
export interface RpcResult<T extends 'result' | 'return'> {
  t: T;
  id: number;
  ok: boolean;
  value?: unknown;
  error?: string;
}

export type HostToWorker =
  | { t: 'init'; manifest: PluginManifest; settings: Record<string, unknown>; sdkVersion: string }
  | { t: 'invoke'; id: number; kind: 'slot'; slot: CallableSlotId; input: unknown }
  | { t: 'invoke'; id: number; kind: 'command'; command: string; args?: unknown }
  | { t: 'event'; name: EventName; payload: unknown }
  | { t: 'settings'; values: Record<string, unknown> }
  | { t: 'panelMessage'; panel: string; data: unknown }
  | RpcResult<'result'>
  | { t: 'ping'; id: number };

export type WorkerToHost =
  | { t: 'ready'; sdkVersion: string }
  | { t: 'call'; id: number; method: BrokerMethod; params?: unknown }
  | RpcResult<'return'>
  | { t: 'pong'; id: number };

export type HostToPanel =
  | { t: 'theme'; theme: { id: string; mode: 'dark' | 'light'; vars: Record<string, string> } }
  | { t: 'payload'; data: unknown }
  | { t: 'message'; data: unknown }
  | RpcResult<'result'>;

export type PanelToHost =
  | { t: 'call'; id: number; method: BrokerMethod; params?: unknown }
  | { t: 'toWorker'; data: unknown }
  | { t: 'keyboard' }
  | { t: 'close' };

export interface FetchParams {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
}

export interface FetchResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface NotifyParams {
  title: string;
  body?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}
