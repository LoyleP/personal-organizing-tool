import Dexie, { type EntityTable } from 'dexie';

export type Status = 'todo' | 'doing' | 'done';
export type Priority = 'low' | 'medium' | 'high';
export type Kind = 'project' | 'task' | 'note';
export type Blocks = unknown[] | null;

interface Base {
  id: string;
  createdAt: number;
  updatedAt: number;
  deleted: 0 | 1;
  dirty: 0 | 1;
}
export interface Project extends Base {
  name: string;
  emoji: string;
  order: number;
}
export interface Task extends Base {
  title: string;
  status: Status;
  priority: Priority | null;
  due: string | null;
  tags: string[];
  projectId: string | null;
  body: Blocks;
  order: number;
}
export interface Note extends Base {
  title: string;
  emoji: string;
  projectId: string | null;
  body: Blocks;
}
export type Row = Project | Task | Note;
export type Fields<T> = Omit<T, keyof Base>;

export const STATUSES: { id: Status; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'In progress' },
  { id: 'done', label: 'Done' },
];
export const PRIORITIES: { id: Priority; label: string }[] = [
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

export const db = new Dexie('organizer') as Dexie & {
  projects: EntityTable<Project, 'id'>;
  tasks: EntityTable<Task, 'id'>;
  notes: EntityTable<Note, 'id'>;
  meta: EntityTable<{ key: string; value: any }, 'key'>;
};

db.version(1).stores({
  projects: 'id, dirty',
  tasks: 'id, dirty, projectId',
  notes: 'id, dirty, projectId',
  meta: 'key',
});

export const tables = { project: db.projects, task: db.tasks, note: db.notes } as const;
