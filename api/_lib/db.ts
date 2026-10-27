import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL!);

let ready: Promise<unknown> | null = null;

export function ensureSchema() {
  ready ??= (async () => {
    await sql.query(`create sequence if not exists records_seq`);
    await sql.query(`create table if not exists records (
      id text primary key,
      type text not null,
      data jsonb not null,
      updated_at bigint not null,
      deleted boolean not null default false,
      seq bigint not null default nextval('records_seq')
    )`);
    await sql.query(`create index if not exists records_seq_idx on records (seq)`);
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

export interface Change {
  id: string;
  type: 'project' | 'task' | 'note';
  data: Record<string, any>;
  updatedAt: number;
  deleted: boolean;
}
