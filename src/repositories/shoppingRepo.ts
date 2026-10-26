import { pool, Queryable } from '../db/connection';
import { ProductRecord, ShoppingItemRecord } from '../types';

const ITEM_COLUMNS = `
  id,
  product_id          AS "productId",
  quantity,
  purchased,
  added_automatically AS "addedAutomatically"`;

/** Matches the partial unique index "one open item per product". */
const OPEN_ITEM_CONFLICT = 'ON CONFLICT (product_id) WHERE purchased = FALSE';

export type PurchasedFilter = 'false' | 'true' | 'all';

export interface ItemWithProductRow extends ShoppingItemRecord {
  product: ProductRecord;
}

const WITH_PRODUCT_SELECT = `
  SELECT
    s.id,
    s.product_id          AS "productId",
    s.quantity,
    s.purchased,
    s.added_automatically AS "addedAutomatically",
    json_build_object(
      'id', p.id,
      'name', p.name,
      'category', p.category,
      'quantity', p.quantity,
      'minimumQuantity', p.minimum_quantity,
      'unit', p.unit
    ) AS product
  FROM shopping_items s
  JOIN products p ON p.id = s.product_id`;

// Items have no family_id of their own; reads, locks and deletes go through the product's family.

export async function findAllWithProduct(
  familyId: number,
  purchased: PurchasedFilter = 'false',
  db: Queryable = pool,
): Promise<ItemWithProductRow[]> {
  const purchasedSql = purchased === 'all' ? '' : ` AND s.purchased = ${purchased === 'true' ? 'TRUE' : 'FALSE'}`;
  const { rows } = await db.query<ItemWithProductRow>(
    `${WITH_PRODUCT_SELECT} WHERE p.family_id = $1${purchasedSql} ORDER BY s.created_at ASC, s.id ASC`,
    [familyId],
  );
  return rows;
}

export async function findByIdWithProduct(
  id: number,
  familyId: number,
  db: Queryable = pool,
): Promise<ItemWithProductRow | null> {
  const { rows } = await db.query<ItemWithProductRow>(`${WITH_PRODUCT_SELECT} WHERE s.id = $1 AND p.family_id = $2`, [
    id,
    familyId,
  ]);
  return rows[0] ?? null;
}

/** Locks the item row until the end of the transaction. */
export async function findByIdForUpdate(id: number, familyId: number, db: Queryable): Promise<ShoppingItemRecord | null> {
  const { rows } = await db.query<ShoppingItemRecord>(
    `SELECT
       s.id,
       s.product_id          AS "productId",
       s.quantity,
       s.purchased,
       s.added_automatically AS "addedAutomatically"
     FROM shopping_items s
     JOIN products p ON p.id = s.product_id
     WHERE s.id = $1 AND p.family_id = $2
     FOR UPDATE OF s`,
    [id, familyId],
  );
  return rows[0] ?? null;
}

/** Creates an automatic item unless the product already has an open one. Returns null if skipped. */
export async function createAutomaticIfNoneOpen(
  productId: number,
  quantity: number,
  db: Queryable = pool,
): Promise<ShoppingItemRecord | null> {
  const { rows } = await db.query<ShoppingItemRecord>(
    `INSERT INTO shopping_items (product_id, quantity, added_automatically)
     VALUES ($1, $2, TRUE)
     ${OPEN_ITEM_CONFLICT} DO NOTHING
     RETURNING ${ITEM_COLUMNS}`,
    [productId, quantity],
  );
  return rows[0] ?? null;
}

/** Creates a manual item, or adds the quantity to the product's existing open item. */
export async function addOrMerge(productId: number, quantity: number, db: Queryable = pool): Promise<ShoppingItemRecord> {
  const { rows } = await db.query<ShoppingItemRecord>(
    `INSERT INTO shopping_items (product_id, quantity, added_automatically)
     VALUES ($1, $2, FALSE)
     ${OPEN_ITEM_CONFLICT} DO UPDATE SET quantity = shopping_items.quantity + EXCLUDED.quantity
     RETURNING ${ITEM_COLUMNS}`,
    [productId, quantity],
  );
  return rows[0];
}

export async function update(
  id: number,
  changes: { quantity?: number; purchased?: boolean },
  db: Queryable = pool,
): Promise<ShoppingItemRecord | null> {
  const { rows } = await db.query<ShoppingItemRecord>(
    `UPDATE shopping_items
     SET quantity     = COALESCE($1::double precision, quantity),
         purchased    = COALESCE($2::boolean, purchased),
         purchased_at = CASE WHEN $2::boolean IS TRUE THEN NOW() ELSE purchased_at END
     WHERE id = $3
     RETURNING ${ITEM_COLUMNS}`,
    [changes.quantity ?? null, changes.purchased ?? null, id],
  );
  return rows[0] ?? null;
}

export async function remove(id: number, familyId: number, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM shopping_items s
     USING products p
     WHERE s.id = $1 AND p.id = s.product_id AND p.family_id = $2`,
    [id, familyId],
  );
  return (rowCount ?? 0) > 0;
}
