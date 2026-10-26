import { pool, withTransaction } from '../db/connection';
import { conflict, notFound, validationError } from '../errors';
import * as productRepo from '../repositories/productRepo';
import * as shoppingRepo from '../repositories/shoppingRepo';
import { ItemWithProductRow, PurchasedFilter } from '../repositories/shoppingRepo';
import { ShoppingItem } from '../types';
import { toProduct } from './productService';

function toShoppingItem(row: ItemWithProductRow): ShoppingItem {
  return { ...row, product: toProduct(row.product) };
}

const itemNotFound = () => notFound('הפריט לא נמצא ברשימת הקניות');

// Every function takes the caller's familyId; items of other families are "not found".

async function getById(familyId: number, id: number): Promise<ShoppingItem> {
  const row = await shoppingRepo.findByIdWithProduct(id, familyId);
  if (!row) throw itemNotFound();
  return toShoppingItem(row);
}

export async function list(familyId: number, purchased: PurchasedFilter): Promise<ShoppingItem[]> {
  const rows = await shoppingRepo.findAllWithProduct(familyId, purchased);
  return rows.map(toShoppingItem);
}

/** Adds an item manually; if the product already has an open item, its quantity is increased instead. */
export async function add(familyId: number, productId: number, quantity: number): Promise<ShoppingItem> {
  const productMissing = () => validationError('המוצר לא קיים', { productId: 'המוצר לא קיים' });

  if (!(await productRepo.findById(productId, familyId))) throw productMissing();

  let itemId: number;
  try {
    itemId = (await shoppingRepo.addOrMerge(productId, quantity, pool)).id;
  } catch (err) {
    // Product deleted between the check and the insert (foreign-key violation).
    if ((err as { code?: string }).code === '23503') throw productMissing();
    throw err;
  }
  return getById(familyId, itemId);
}

/**
 * Updates quantity and/or marks as purchased. Marking as purchased adds the item's
 * quantity to the product's stock in the same transaction, and does not trigger an
 * automatic re-add even if the product is still low. Purchased items are final (409).
 */
export async function update(
  familyId: number,
  id: number,
  changes: { quantity?: number; purchased?: boolean },
): Promise<ShoppingItem> {
  await withTransaction(async (client) => {
    const item = await shoppingRepo.findByIdForUpdate(id, familyId, client);
    if (!item) throw itemNotFound();
    if (item.purchased) throw conflict('הפריט כבר סומן כנרכש ואי אפשר לשנות אותו');

    const updated = await shoppingRepo.update(id, changes, client);
    if (!updated) throw itemNotFound();

    if (changes.purchased === true) {
      await productRepo.addQuantity(updated.productId, updated.quantity, client);
    }
  });
  return getById(familyId, id);
}

export async function remove(familyId: number, id: number): Promise<void> {
  const deleted = await shoppingRepo.remove(id, familyId);
  if (!deleted) throw itemNotFound();
}
