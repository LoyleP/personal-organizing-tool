import { useLiveQuery } from 'dexie-react-hooks';
import { db, tables, type Fields, type Kind, type Note, type Project, type Task } from './db';
import { scheduleSync } from './sync';

type RowOf<K extends Kind> = K extends 'project' ? Project : K extends 'task' ? Task : Note;

export async function create<K extends Kind>(kind: K, fields: Fields<RowOf<K>>): Promise<RowOf<K>> {
  const now = Date.now();
  const row = { ...fields, id: crypto.randomUUID(), createdAt: now, updatedAt: now, deleted: 0, dirty: 1 } as RowOf<K>;
  await (tables[kind] as any).add(row);
  scheduleSync();
  return row;
}

export async function patch<K extends Kind>(kind: K, id: string, changes: Partial<Fields<RowOf<K>>>) {
  await (tables[kind] as any).update(id, { ...changes, updatedAt: Date.now(), dirty: 1 });
  scheduleSync();
}

export async function remove(kind: Kind, id: string) {
  await tables[kind].update(id, { deleted: 1, updatedAt: Date.now(), dirty: 1 });
  scheduleSync();
}

export async function removeProject(id: string) {
  await db.transaction('rw', [db.projects, db.tasks, db.notes], async () => {
    const now = Date.now();
    await db.projects.update(id, { deleted: 1, updatedAt: now, dirty: 1 });
    await db.tasks.where('projectId').equals(id).modify({ projectId: null, updatedAt: now, dirty: 1 });
    await db.notes.where('projectId').equals(id).modify({ projectId: null, updatedAt: now, dirty: 1 });
  });
  scheduleSync();
}

/** Midpoint ordering so a move only rewrites one row. */
export function between(a?: number, b?: number) {
  if (a == null && b == null) return 1;
  if (a == null) return b! - 1;
  if (b == null) return a + 1;
  return (a + b) / 2;
}

const alive = <T extends { deleted: 0 | 1 }>(rows: T[]) => rows.filter((r) => !r.deleted);

export const useTasks = () => useLiveQuery(() => db.tasks.toArray().then(alive), []);
export const useNotes = () =>
  useLiveQuery(() => db.notes.toArray().then((r) => alive(r).sort((a, b) => a.createdAt - b.createdAt)), []);
export const useProjects = () =>
  useLiveQuery(() => db.projects.toArray().then((r) => alive(r).sort((a, b) => a.order - b.order)), []);

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
