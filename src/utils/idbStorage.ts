import { ShoeItem } from '../types/inventory';
import { sortWithFavoritesFirst, stripReadyMadeImagesFromShoes } from './storage';

const IDB_NAME = 'IavendaWarehouseDB_v1';
const STORE_NAME = 'kvStore';
const STORAGE_KEY_SHOES = 'iavenda_warehouse_inventory_v2';
const STORAGE_KEY_DELETED = 'iavenda_deleted_shoe_ids_v1';

let idbPromise: Promise<IDBDatabase | null> | null = null;

function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!idbPromise) {
    idbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('IndexedDB failed to open, falling back to localStorage');
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization error:', err);
        resolve(null);
      }
    });
  }
  return idbPromise;
}

export async function getIdbItem<T>(key: string): Promise<T | null> {
  const db = await getDb();
  if (!db) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result !== undefined && req.result !== null) {
          resolve(req.result as T);
        } else {
          // Fallback to localStorage if not yet migrated to IndexedDB
          try {
            const raw = localStorage.getItem(key);
            resolve(raw ? JSON.parse(raw) : null);
          } catch {
            resolve(null);
          }
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function setIdbItem<T>(key: string, value: T): Promise<void> {
  // Always attempt localStorage first for fast sync between tabs
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // LocalStorage quota may be exceeded due to images; IndexedDB will safely handle it
  }

  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// Authoritative deleted shoe IDs (only deleted when an employee explicitly clicks delete)
export function getLocalDeletedShoeIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalDeletedShoeIds(ids: string[]): void {
  const unique = Array.from(new Set(ids));
  try {
    localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(unique));
  } catch {
    // Ignore quota issues
  }
  setIdbItem(STORAGE_KEY_DELETED, unique);
}

export function addDeletedShoeId(id: string): string[] {
  if (!id) return getLocalDeletedShoeIds();
  const current = getLocalDeletedShoeIds();
  const next = Array.from(new Set([...current, id]));
  saveLocalDeletedShoeIds(next);
  return next;
}

export function removeDeletedShoeId(id: string): string[] {
  const current = getLocalDeletedShoeIds();
  const next = current.filter((x) => x !== id);
  saveLocalDeletedShoeIds(next);
  return next;
}

/**
 * Intelligent bidirectional shoe reconciliation.
 * GUARANTEES: A piece is NEVER deleted unless an employee explicitly deleted it (present in deletedIds).
 * If the server boots up empty or a client had added pieces offline, the pieces are preserved and merged.
 */
export function reconcileShoes(
  localShoes: ShoeItem[],
  remoteShoes: ShoeItem[],
  deletedIds: string[] = []
): { merged: ShoeItem[]; hasNewLocalToPush: boolean } {
  const deletedSet = new Set([...getLocalDeletedShoeIds(), ...deletedIds]);
  const cleanedLocal = stripReadyMadeImagesFromShoes(localShoes || []).filter(
    (s) => s && s.id && !deletedSet.has(s.id)
  );
  const cleanedRemote = stripReadyMadeImagesFromShoes(remoteShoes || []).filter(
    (s) => s && s.id && !deletedSet.has(s.id)
  );

  const map = new Map<string, ShoeItem>();

  // 1. Add all cleaned remote shoes
  for (const s of cleanedRemote) {
    map.set(s.id, s);
  }

  let hasNewLocalToPush = false;

  // 2. Add or merge local shoes
  for (const local of cleanedLocal) {
    if (!map.has(local.id)) {
      // Local has a piece that the remote is missing! (e.g. Server restarted with empty db)
      // DO NOT DELETE IT! Keep it and mark to push to server!
      map.set(local.id, local);
      hasNewLocalToPush = true;
    } else {
      const remote = map.get(local.id)!;
      // If local is newer, keep local
      if ((local.updatedAt || 0) > (remote.updatedAt || 0)) {
        map.set(local.id, local);
        hasNewLocalToPush = true;
      }
    }
  }

  const merged = sortWithFavoritesFirst(Array.from(map.values()));
  return { merged, hasNewLocalToPush };
}
