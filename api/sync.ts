import { ensureSchema, sql, type Change } from './_lib/db.js';

const PAGE = 500;

export async function POST(req: Request) {
  await ensureSchema();
  const { cursor = 0, changes = [] } = (await req.json()) as { cursor?: number; changes?: Change[] };

  if (changes.length) {
    // Last write wins per record, compared on the client's updatedAt.
    await sql.query(
      `insert into records (id, type, data, updated_at, deleted)
       select x.id, x.type, x.data, x.updated_at, x.deleted
       from jsonb_to_recordset($1::jsonb) as x(id text, type text, data jsonb, updated_at bigint, deleted boolean)
       on conflict (id) do update set
         data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted,
         seq = nextval('records_seq')
       where records.updated_at < excluded.updated_at`,
      [
        JSON.stringify(
          changes.map((c) => ({ id: c.id, type: c.type, data: c.data, updated_at: c.updatedAt, deleted: c.deleted })),
        ),
      ],
    );
  }

  const rows = await sql.query(
    'select id, type, data, updated_at, deleted, seq from records where seq > $1 order by seq limit $2',
    [cursor, PAGE],
  );

  return Response.json({
    cursor: rows.length ? Number(rows[rows.length - 1].seq) : cursor,
    more: rows.length === PAGE,
    rows: rows.map((r) => ({
      id: r.id,
      type: r.type,
      data: r.data,
      updatedAt: Number(r.updated_at),
      deleted: r.deleted,
    })),
  });
}
