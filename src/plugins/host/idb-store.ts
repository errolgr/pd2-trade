import type { JsonValue } from '@pd2-trader/plugin-sdk';
import type { PluginBundle } from './types';

/**
 * Plugin bundles and plugin KV live in IndexedDB (localStorage is ~5 MB for the whole app, and the settings file
 * should stay small). Bundles are keyed `${id}@${version}`; KV records by plugin id. Origin-private to the host:
 * sandboxes have an opaque origin and can't open it.
 */

const DB_NAME = 'pd2-plugins';
const BUNDLES = 'bundles';
const KV = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(BUNDLES);
      request.result.createObjectStore(KV);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'));
  });
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = op(db.transaction(store, mode).objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
      }),
  );
}

export const idbStore = {
  readBundle: async (key: string): Promise<PluginBundle | null> =>
    ((await run(BUNDLES, 'readonly', (s) => s.get(key))) as PluginBundle | undefined) ?? null,
  writeBundle: async (key: string, bundle: PluginBundle): Promise<void> => {
    await run(BUNDLES, 'readwrite', (s) => s.put(bundle, key));
  },
  deleteBundles: async (id: string): Promise<void> => {
    // Keys are `${id}@${version}`: '@' sorts before every version digit, '@\uffff' bounds the range.
    await run(BUNDLES, 'readwrite', (s) => s.delete(IDBKeyRange.bound(`${id}@`, `${id}@\uffff`)));
    await run(KV, 'readwrite', (s) => s.delete(id));
  },
  readKv: async (id: string): Promise<Record<string, JsonValue>> =>
    ((await run(KV, 'readonly', (s) => s.get(id))) as Record<string, JsonValue> | undefined) ?? {},
  writeKv: async (id: string, data: Record<string, JsonValue>): Promise<void> => {
    await run(KV, 'readwrite', (s) => s.put(data, id));
  },
};
