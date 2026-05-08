export const runtime = "nodejs";

import { Pool } from "pg";

export async function POST(req: Request) {
  const { host, port, database, user, password, ssl, query } = await req.json();
  if (!query) return Response.json({ error: "query required" }, { status: 400 });

  // Block destructive statements
  const blocked = /^\s*(drop|truncate|delete|alter|insert|update|create)\s/i;
  if (blocked.test(query.trim())) {
    return Response.json({ error: "Only SELECT queries are allowed" }, { status: 403 });
  }

  const pool = new Pool({
    host, port: port ?? 5432, database, user, password,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 8000,
  });

  try {
    const client = await pool.connect();
    const start = Date.now();
    const result = await client.query(query);
    const duration = Date.now() - start;
    client.release();
    await pool.end();

    return Response.json({
      columns: result.fields.map(f => f.name),
      rows: result.rows.slice(0, 500),
      rowCount: result.rowCount,
      duration,
    });
  } catch (err) {
    await pool.end().catch(() => {});
    return Response.json({ error: String(err) }, { status: 400 });
  }
}
