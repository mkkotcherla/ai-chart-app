export const runtime = "nodejs";

import { Pool } from "pg";

export async function POST(req: Request) {
  const { host, port, database, user, password, ssl } = await req.json();
  if (!host || !database) return Response.json({ error: "host and database are required" }, { status: 400 });

  const pool = new Pool({
    host, port: port ?? 5432, database, user, password,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 6000,
  });

  try {
    const client = await pool.connect();

    // Fetch tables + row counts
    const tablesRes = await client.query(`
      SELECT
        t.table_name,
        (SELECT COUNT(*) FROM information_schema.columns c
         WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS col_count,
        pg_stat_user_tables.n_live_tup AS row_count
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables ON pg_stat_user_tables.relname = t.table_name
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
      LIMIT 30
    `);

    // Columns for each table
    const tables: Record<string, string[]> = {};
    for (const row of tablesRes.rows) {
      const colRes = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
        [row.table_name]
      );
      tables[row.table_name] = colRes.rows.map(c => `${c.column_name} (${c.data_type})`);
    }

    client.release();
    await pool.end();

    return Response.json({ success: true, tables: tablesRes.rows, columns: tables });
  } catch (err) {
    await pool.end().catch(() => {});
    return Response.json({ error: String(err) }, { status: 400 });
  }
}
