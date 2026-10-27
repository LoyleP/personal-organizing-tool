import { useSyncExternalStore } from 'react';
import { db, tables, type Kind, type Row } from './db';

type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';
let status: SyncStatus = 'idle';
const listeners = new Set<() => void>();
const setStatus = (s: SyncStatus) => {
  status = s;
  listeners.forEach((l) => l());
};
export const useSyncStatus = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => status,
  );

let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;
let again = false;

export function scheduleSync(delay = 400) {
  clearTimeout(timer);
  timer = setTimeout(sync, delay);
}

const kinds = Object.keys(tables) as Kind[];

export async function sync() {
  if (running) {
    again = true;
    return;
  }
  running = true;
  setStatus('syncing');
  try {
    const cursor: number = (await db.meta.get('cursor'))?.value ?? 0;
    const dirty = (
      await Promise.all(
        kinds.map(async (kind) =>
          (await tables[kind].where('dirty').equals(1).toArray()).map((row) => ({ kind, row: row as Row })),
        ),
      )
    ).flat();

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        cursor,
        changes: dirty.map(({ kind, row }) => {
          const { dirty: _, ...data } = row;
          return { id: row.id, type: kind, data, updatedAt: row.updatedAt, deleted: !!row.deleted };
        }),
      }),
    });
    if (!res.ok) throw new Error(`sync ${res.status}`);
    const body: {
      cursor: number;
      more: boolean;
      rows: { id: string; type: Kind; data: Row; updatedAt: number; deleted: boolean }[];
    } = await res.json();

    await db.transaction('rw', [db.projects, db.tasks, db.notes, db.meta], async () => {
      for (const { kind, row } of dirty) {
        const cur = await tables[kind].get(row.id);
        if (cur && cur.updatedAt === row.updatedAt) await tables[kind].update(row.id, { dirty: 0 });
      }
      for (const r of body.rows) {
        const table = tables[r.type];
        if (!table) continue;
        const cur = await table.get(r.id);
        if (cur && cur.updatedAt >= r.updatedAt) continue;
        await table.put({ ...r.data, id: r.id, updatedAt: r.updatedAt, deleted: r.deleted ? 1 : 0, dirty: 0 } as any);
      }
      await db.meta.put({ key: 'cursor', value: body.cursor });
    });
    if (body.more) again = true;
    setStatus('idle');
  } catch {
    setStatus(navigator.onLine ? 'error' : 'offline');
  } finally {
    running = false;
    if (again) {
      again = false;
      scheduleSync(0);
    }
  }
}

export function startSync() {
  sync();
  addEventListener('online', () => sync());
  document.addEventListener('visibilitychange', () => !document.hidden && sync());
  setInterval(() => !document.hidden && sync(), 30_000);
}
