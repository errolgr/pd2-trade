import {
  EVENT_PERMISSIONS,
  measureTree,
  SDK_VERSION,
  SLOT_OUTPUT_SCHEMAS,
  SLOT_PERMISSIONS,
  UI_LIMITS,
  type CallableSlotId,
  type EventMap,
  type EventName,
  type HostToWorker,
  type PluginManifest,
  type SlotOutput,
  type WorkerToHost,
} from '@pd2-trader/plugin-sdk';
import {
  COMMAND_TIMEOUT_MS,
  SLOT_TIMEOUT_MS,
  TimeoutError,
  WATCHDOG_INTERVAL_MS,
  WATCHDOG_TIMEOUT_MS,
  type FailureKind,
} from './budget';
import { PermissionDeniedError, type PluginBroker } from './broker';

export class InvalidUiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUiError';
  }
}

/** Validates a slot output against its schema and the tree limits. */
export function validateSlotOutput<S extends CallableSlotId>(slot: S, value: unknown): SlotOutput<S> {
  const parsed = SLOT_OUTPUT_SCHEMAS[slot].safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new InvalidUiError(`Invalid ${slot} output at ${issue.path.join('.') || 'root'}: ${issue.message}`);
  }
  const { depth, nodes } = measureTree(parsed.data);
  if (depth > UI_LIMITS.maxDepth) throw new InvalidUiError(`${slot} output nests deeper than ${UI_LIMITS.maxDepth}`);
  if (nodes > UI_LIMITS.maxNodes) throw new InvalidUiError(`${slot} output has more than ${UI_LIMITS.maxNodes} nodes`);
  return parsed.data as SlotOutput<S>;
}

/** A budget timer firing later than this past its deadline means the host thread was busy, not the plugin. */
const HOST_BUSY_SLACK_MS = 50;

type InvokeMessage =
  | { t: 'invoke'; kind: 'slot'; slot: CallableSlotId; input: unknown }
  | { t: 'invoke'; kind: 'command'; command: string; args?: unknown };

export interface PortLike {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent) => void) | null;
  close(): void;
}

export interface InstanceOptions {
  manifest: PluginManifest;
  port: PortLike;
  broker: PluginBroker;
  settings(): Record<string, string | number | boolean>;
  /** Terminates the sandbox (removes the frame). */
  destroy(): void;
  onFailure(kind: FailureKind, detail: string): void;
  /** The worker died (crash or watchdog); the manager decides whether to restart. */
  onDead(reason: string): void;
  onPanelMessage(panel: string, data: unknown): void;
}

/** One running plugin: RPC over its port, budgets, watchdog. */
export class PluginInstance {
  private seq = 0;
  private readonly pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private ready = false;
  private readyWaiters: Array<() => void> = [];
  private dead = false;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private awaitingPong: number | null = null;

  constructor(private readonly opts: InstanceOptions) {
    opts.port.onmessage = (event) => this.onMessage(event.data as WorkerToHost);
  }

  get manifest(): PluginManifest {
    return this.opts.manifest;
  }

  get alive(): boolean {
    return !this.dead;
  }

  /** Sends init and waits for the worker's `ready`; starts the watchdog. */
  async start(timeoutMs = 3000): Promise<void> {
    this.post({ t: 'init', manifest: this.opts.manifest, settings: this.opts.settings(), sdkVersion: SDK_VERSION });
    await this.withTimeout(
      new Promise<void>((resolve) => (this.ready ? resolve() : this.readyWaiters.push(resolve))),
      timeoutMs,
    );
    this.watchdog = setInterval(() => this.ping(), WATCHDOG_INTERVAL_MS);
  }

  private ping(): void {
    if (this.dead) return;
    const id = ++this.seq;
    this.awaitingPong = id;
    this.post({ t: 'ping', id });
    setTimeout(() => {
      if (this.awaitingPong === id) this.kill(`Unresponsive for ${WATCHDOG_TIMEOUT_MS} ms (terminated)`);
    }, WATCHDOG_TIMEOUT_MS);
  }

  private post(message: HostToWorker): void {
    if (!this.dead) this.opts.port.postMessage(message);
  }

  private onMessage(message: WorkerToHost): void {
    if (this.dead || !message || typeof message !== 'object') return;
    switch (message.t) {
      case 'ready':
        this.ready = true;
        this.readyWaiters.splice(0).forEach((fn) => fn());
        break;
      case 'pong':
        if (this.awaitingPong === message.id) this.awaitingPong = null;
        break;
      case 'return': {
        const entry = this.pending.get(message.id);
        if (!entry) break; // timed out already: late results are dropped
        this.pending.delete(message.id);
        if (message.ok) entry.resolve(message.value);
        else entry.reject(new Error(String(message.error ?? 'Plugin error').slice(0, 300)));
        break;
      }
      case 'call': {
        const { id, method, params } = message;
        this.opts.broker.handle(method, params).then(
          (value) => this.post({ t: 'result', id, ok: true, value }),
          (error: unknown) =>
            this.post({ t: 'result', id, ok: false, error: error instanceof Error ? error.message : String(error) }),
        );
        break;
      }
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, onTimeout?: () => void): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = performance.now();
      const expire = () => {
        onTimeout?.();
        reject(new TimeoutError(ms));
      };
      let timer = setTimeout(() => {
        // A timer this late means the host's own thread was busy (a large render): the plugin's answer may already
        // be queued behind this task. One more turn lets it land instead of blaming the plugin for the host's jank.
        if (performance.now() - start > ms + HOST_BUSY_SLACK_MS) timer = setTimeout(expire, 0);
        else expire();
      }, ms);
      promise.then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        (e: unknown) => {
          clearTimeout(timer);
          reject(e);
        },
      );
    });
  }

  private invoke(message: InvokeMessage, timeoutMs: number): Promise<unknown> {
    if (this.dead) return Promise.reject(new Error('Plugin is not running'));
    const id = ++this.seq;
    const result = new Promise<unknown>((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.post({ ...message, id } as HostToWorker);
    return this.withTimeout(result, timeoutMs, () => this.pending.delete(id));
  }

  /**
   * Calls a slot; resolves with validated output. Timeouts, errors and invalid trees count as failures
   * (the manager auto-disables repeat offenders). Slots whose permission was not granted never get input.
   */
  async invokeSlot<S extends CallableSlotId>(
    slot: S,
    input: unknown,
    timeoutMs = SLOT_TIMEOUT_MS,
  ): Promise<SlotOutput<S>> {
    const needed = SLOT_PERMISSIONS[slot];
    if (!this.opts.manifest.slots.includes(slot)) throw new PermissionDeniedError(`${slot} is not declared`);
    if (needed && !this.opts.broker.has(needed)) throw new PermissionDeniedError(`${slot} needs ${needed}`);
    try {
      const value = await this.invoke({ t: 'invoke', kind: 'slot', slot, input }, timeoutMs);
      return validateSlotOutput(slot, value);
    } catch (error) {
      const kind: FailureKind =
        error instanceof TimeoutError ? 'timeout' : error instanceof InvalidUiError ? 'invalid-ui' : 'crash';
      this.opts.onFailure(kind, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async runCommand(command: string, args?: unknown): Promise<void> {
    if (!this.opts.manifest.commands.some((c) => c.id === command))
      throw new PermissionDeniedError(`Unknown command ${command}`);
    try {
      await this.invoke({ t: 'invoke', kind: 'command', command, args }, COMMAND_TIMEOUT_MS);
    } catch (error) {
      this.opts.onFailure(error instanceof TimeoutError ? 'timeout' : 'crash', String((error as Error).message));
      throw error;
    }
  }

  /** Delivers an event when the plugin holds its permission; silently skipped otherwise. */
  emit<E extends EventName>(name: E, payload: EventMap[E]): void {
    const needed = EVENT_PERMISSIONS[name];
    if (needed && !this.opts.broker.has(needed)) return;
    this.post({ t: 'event', name, payload });
  }

  sendSettings(values: Record<string, unknown>): void {
    this.post({ t: 'settings', values });
  }

  sendPanelMessage(panel: string, data: unknown): void {
    this.post({ t: 'panelMessage', panel, data });
  }

  /** The worker crashed (uncaught error in the sandbox). */
  crashed(message: string): void {
    this.opts.onFailure('crash', message);
  }

  private kill(reason: string): void {
    if (this.dead) return;
    this.opts.onFailure('crash', reason);
    this.stop();
    this.opts.onDead(reason);
  }

  stop(): void {
    if (this.dead) return;
    this.dead = true;
    clearInterval(this.watchdog ?? undefined);
    for (const entry of this.pending.values()) entry.reject(new Error('Plugin stopped'));
    this.pending.clear();
    this.opts.port.onmessage = null;
    this.opts.port.close();
    this.opts.destroy();
  }
}
