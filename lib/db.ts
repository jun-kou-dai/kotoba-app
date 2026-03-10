// IndexedDB操作 (Nano Storybook db.js パターンを移植+拡張)
import { ChildProfile } from '../types/profile';
import { LearningSession, MasteryStatus, DailyRecord, calcMasteryLevel } from '../types/learning';

const DB_NAME = 'KotobaApp';
const DB_VERSION = 1;

const STORES = {
  profiles: 'profiles',
  sessions: 'sessions',
  mastery: 'mastery',
  dailyRecords: 'dailyRecords',
} as const;

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORES.profiles)) {
        database.createObjectStore(STORES.profiles, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.sessions)) {
        const store = database.createObjectStore(STORES.sessions, { keyPath: 'id' });
        store.createIndex('childId', 'childId');
        store.createIndex('themeId', 'themeId');
      }
      if (!database.objectStoreNames.contains(STORES.mastery)) {
        const store = database.createObjectStore(STORES.mastery, { keyPath: ['vocabId', 'childId'] });
        store.createIndex('childId', 'childId');
      }
      if (!database.objectStoreNames.contains(STORES.dailyRecords)) {
        const store = database.createObjectStore(STORES.dailyRecords, { keyPath: ['date', 'childId'] });
        store.createIndex('childId', 'childId');
      }
    };
    req.onsuccess = (e) => { db = (e.target as IDBOpenDBRequest).result; resolve(db); };
    req.onerror = (e) => reject(e);
  });
}

// === Profiles ===
export async function saveProfile(profile: ChildProfile): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.profiles, 'readwrite');
    tx.objectStore(STORES.profiles).put(profile);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

export async function getProfiles(): Promise<ChildProfile[]> {
  const database = await openDB();
  return new Promise((resolve) => {
    const tx = database.transaction(STORES.profiles, 'readonly');
    const req = tx.objectStore(STORES.profiles).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

export async function getChildById(id: string): Promise<ChildProfile | null> {
  const database = await openDB();
  return new Promise((resolve) => {
    const tx = database.transaction(STORES.profiles, 'readonly');
    const req = tx.objectStore(STORES.profiles).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

export async function deleteProfile(id: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.profiles, 'readwrite');
    tx.objectStore(STORES.profiles).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

// === Sessions ===
export async function saveSession(session: LearningSession): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.sessions, 'readwrite');
    tx.objectStore(STORES.sessions).put(session);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

export async function getSessionsByChild(childId: string): Promise<LearningSession[]> {
  const database = await openDB();
  return new Promise((resolve) => {
    const tx = database.transaction(STORES.sessions, 'readonly');
    const index = tx.objectStore(STORES.sessions).index('childId');
    const req = index.getAll(childId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

// === Mastery ===
export async function getMasteryByChild(childId: string): Promise<MasteryStatus[]> {
  const database = await openDB();
  return new Promise((resolve) => {
    const tx = database.transaction(STORES.mastery, 'readonly');
    const index = tx.objectStore(STORES.mastery).index('childId');
    const req = index.getAll(childId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

export async function updateMastery(childId: string, vocabId: string, isCorrect: boolean): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.mastery, 'readwrite');
    const store = tx.objectStore(STORES.mastery);
    const getReq = store.get([vocabId, childId]);
    getReq.onsuccess = () => {
      const existing: MasteryStatus | undefined = getReq.result;
      const updated: MasteryStatus = existing
        ? {
            ...existing,
            correctCount: existing.correctCount + (isCorrect ? 1 : 0),
            totalCount: existing.totalCount + 1,
            lastAnsweredAt: new Date().toISOString(),
            masteryLevel: calcMasteryLevel(
              existing.correctCount + (isCorrect ? 1 : 0),
              existing.totalCount + 1
            ),
          }
        : {
            vocabId,
            childId,
            correctCount: isCorrect ? 1 : 0,
            totalCount: 1,
            lastAnsweredAt: new Date().toISOString(),
            masteryLevel: isCorrect ? 1 : 1,
          };
      store.put(updated);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

// === Daily Records ===
export async function recordDaily(childId: string): Promise<void> {
  const database = await openDB();
  const date = new Date().toISOString().split('T')[0];
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.dailyRecords, 'readwrite');
    const store = tx.objectStore(STORES.dailyRecords);
    const getReq = store.get([date, childId]);
    getReq.onsuccess = () => {
      const existing: DailyRecord | undefined = getReq.result;
      store.put({
        date,
        childId,
        sessionCount: existing ? existing.sessionCount + 1 : 1,
      });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

export async function getDailyRecords(childId: string): Promise<DailyRecord[]> {
  const database = await openDB();
  return new Promise((resolve) => {
    const tx = database.transaction(STORES.dailyRecords, 'readonly');
    const index = tx.objectStore(STORES.dailyRecords).index('childId');
    const req = index.getAll(childId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

export function getStreak(records: DailyRecord[]): number {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split('T')[0];
    if (sorted[i]?.date === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
