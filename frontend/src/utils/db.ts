import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __leafPgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!global.__leafPgPool) {
    global.__leafPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }

  return global.__leafPgPool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number | null }> {
  const result = await getPool().query(text, params);
  return { rows: result.rows as T[], rowCount: result.rowCount };
}
