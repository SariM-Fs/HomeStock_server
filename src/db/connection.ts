import fs from 'fs';
import path from 'path';
import { Pool, PoolClient } from 'pg';
import { config } from '../config';

export const pool = new Pool({ connectionString: config.databaseUrl });

/** Anything that can run a query: the pool itself or a client inside a transaction. */
export type Queryable = Pick<Pool | PoolClient, 'query'>;

/** Creates the tables from schema.sql if they don't exist yet. */
export async function initSchema(): Promise<void> {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

/** Runs fn inside a single transaction, rolling back on any error. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
