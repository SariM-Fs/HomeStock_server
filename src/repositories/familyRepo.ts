import { pool, Queryable } from '../db/connection';
import { Family } from '../types';

const COLUMNS = 'id, name, code';

export async function findById(id: number, db: Queryable = pool): Promise<Family | null> {
  const { rows } = await db.query<Family>(`SELECT ${COLUMNS} FROM families WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findByCode(code: string, db: Queryable = pool): Promise<Family | null> {
  const { rows } = await db.query<Family>(`SELECT ${COLUMNS} FROM families WHERE code = $1`, [code]);
  return rows[0] ?? null;
}

/**
 * Returns null if the code is already taken. That is skipped with ON CONFLICT rather than
 * raised as an error, so the caller can retry inside the same transaction.
 */
export async function createIfCodeFree(name: string, code: string, db: Queryable = pool): Promise<Family | null> {
  const { rows } = await db.query<Family>(
    `INSERT INTO families (name, code) VALUES ($1, $2)
     ON CONFLICT (code) DO NOTHING
     RETURNING ${COLUMNS}`,
    [name, code],
  );
  return rows[0] ?? null;
}
