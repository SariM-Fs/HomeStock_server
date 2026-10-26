import { pool, Queryable } from '../db/connection';
import { Category, ProductInput, ProductRecord } from '../types';

// Every query takes familyId, so a family can never see or change another family's products.

const COLUMNS = `
  id,
  name,
  category,
  quantity,
  minimum_quantity AS "minimumQuantity",
  unit`;

export interface ProductQuery {
  search?: string;
  category?: Category;
  sortBy?: 'name' | 'quantity';
  order?: 'asc' | 'desc';
}

const SORT_COLUMNS = { name: 'name', quantity: 'quantity' } as const;

export async function findAll(
  familyId: number,
  query: ProductQuery = {},
  db: Queryable = pool,
): Promise<ProductRecord[]> {
  const values: unknown[] = [familyId];
  const where: string[] = ['family_id = $1'];

  if (query.search) {
    // Escape LIKE wildcards so the search is plain text.
    values.push(`%${query.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where.push(`name ILIKE $${values.length}`);
  }
  if (query.category) {
    values.push(query.category);
    where.push(`category = $${values.length}`);
  }

  const direction = query.order === 'desc' ? 'DESC' : 'ASC';
  const orderBy = query.sortBy ? `${SORT_COLUMNS[query.sortBy]} ${direction}, id ASC` : 'id ASC';

  const { rows } = await db.query<ProductRecord>(
    `SELECT ${COLUMNS} FROM products WHERE ${where.join(' AND ')} ORDER BY ${orderBy}`,
    values,
  );
  return rows;
}

export async function findById(
  id: number,
  familyId: number,
  db: Queryable = pool,
  { forUpdate = false } = {},
): Promise<ProductRecord | null> {
  const { rows } = await db.query<ProductRecord>(
    `SELECT ${COLUMNS} FROM products WHERE id = $1 AND family_id = $2${forUpdate ? ' FOR UPDATE' : ''}`,
    [id, familyId],
  );
  return rows[0] ?? null;
}

export async function create(familyId: number, input: ProductInput, db: Queryable = pool): Promise<ProductRecord> {
  const { rows } = await db.query<ProductRecord>(
    `INSERT INTO products (family_id, name, category, quantity, minimum_quantity, unit)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNS}`,
    [familyId, input.name, input.category, input.quantity, input.minimumQuantity, input.unit],
  );
  return rows[0];
}

export async function update(
  id: number,
  familyId: number,
  input: ProductInput,
  db: Queryable = pool,
): Promise<ProductRecord | null> {
  const { rows } = await db.query<ProductRecord>(
    `UPDATE products
     SET name = $1, category = $2, quantity = $3, minimum_quantity = $4, unit = $5
     WHERE id = $6 AND family_id = $7
     RETURNING ${COLUMNS}`,
    [input.name, input.category, input.quantity, input.minimumQuantity, input.unit, id, familyId],
  );
  return rows[0] ?? null;
}

export async function setQuantity(
  id: number,
  familyId: number,
  quantity: number,
  db: Queryable = pool,
): Promise<ProductRecord | null> {
  const { rows } = await db.query<ProductRecord>(
    `UPDATE products SET quantity = $1 WHERE id = $2 AND family_id = $3 RETURNING ${COLUMNS}`,
    [quantity, id, familyId],
  );
  return rows[0] ?? null;
}

/** Called only for a product already reached through the family's own shopping item. */
export async function addQuantity(id: number, amount: number, db: Queryable = pool): Promise<ProductRecord | null> {
  const { rows } = await db.query<ProductRecord>(
    `UPDATE products SET quantity = quantity + $1 WHERE id = $2 RETURNING ${COLUMNS}`,
    [amount, id],
  );
  return rows[0] ?? null;
}

/** Returns true if a product was deleted. Its shopping items are removed by ON DELETE CASCADE. */
export async function remove(id: number, familyId: number, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query('DELETE FROM products WHERE id = $1 AND family_id = $2', [id, familyId]);
  return (rowCount ?? 0) > 0;
}
