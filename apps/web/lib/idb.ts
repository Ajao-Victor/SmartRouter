/**
 * Minimal IndexedDB key-value helper (security.md §3: no localStorage for app state).
 * Used for persisted preferences and, in Task 20, the voucher signer key handle.
 * Every call resolves even when IndexedDB is unavailable (private mode, jsdom): reads
 * return `undefined`, writes are no-ops. Nothing here ever throws to the caller.
 */

const DB_NAME = 'smartrouter';
const STORE = 'kv';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return Promise.resolve(null);
  dbPromise ??= new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => {
        resolve(req.result);
      };
      req.onerror = () => {
        resolve(null);
      };
      req.onblocked = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) {
          resolve(undefined);
          return;
        }
        try {
          const tx = db.transaction(STORE, mode);
          const req = op(tx.objectStore(STORE));
          req.onsuccess = () => {
            resolve(req.result);
          };
          req.onerror = () => {
            resolve(undefined);
          };
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export const idb = {
  get<T = unknown>(key: string): Promise<T | undefined> {
    return run<T>('readonly', (s) => s.get(key) as IDBRequest<T>);
  },
  set(key: string, value: unknown): Promise<void> {
    return run('readwrite', (s) => s.put(value, key)).then(() => undefined);
  },
  del(key: string): Promise<void> {
    return run('readwrite', (s) => s.delete(key)).then(() => undefined);
  },
  available: hasIndexedDb,
};

/** Zustand `persist` storage adapter backed by IndexedDB (async StateStorage). */
export const idbStateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const v = await idb.get<string>(name);
    return typeof v === 'string' ? v : null;
  },
  setItem: (name: string, value: string): Promise<void> => idb.set(name, value),
  removeItem: (name: string): Promise<void> => idb.del(name),
};
