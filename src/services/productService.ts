import { PoolClient } from 'pg';
import { Queryable, withTransaction } from '../db/connection';
import { conflict, forbidden, isUniqueViolation, notFound } from '../errors';
import * as productRepo from '../repositories/productRepo';
import * as shoppingRepo from '../repositories/shoppingRepo';
import { ProductQueryParams } from '../schemas/productSchemas';
import { Product, ProductInput, ProductRecord, ProductStatus, User } from '../types';

/** The single place where a product's status is decided. */
export function getStatus(quantity: number, minimumQuantity: number): ProductStatus {
  if (quantity === 0) return 'חסר';
  if (quantity < minimumQuantity) return 'נמוך';
  return 'תקין';
}

export function toProduct(record: ProductRecord): Product {
  return { ...record, status: getStatus(record.quantity, record.minimumQuantity) };
}

/**
 * If the product is low or missing and has no open shopping item,
 * adds one automatically with the quantity missing up to minimumQuantity (at least 1).
 */
export async function autoAddToShoppingList(product: ProductRecord, db: Queryable): Promise<void> {
  const status = getStatus(product.quantity, product.minimumQuantity);
  if (status === 'תקין') return;

  const suggested = Math.max(1, product.minimumQuantity - product.quantity);
  await shoppingRepo.createAutomaticIfNoneOpen(product.id, suggested, db);
}

const nameTaken = () => conflict('כבר קיים מוצר בשם זה', { name: 'כבר קיים מוצר בשם זה' });
const productNotFound = () => notFound('המוצר לא נמצא');

/** Maps a duplicate-name DB error to 409. */
async function guardUniqueName<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isUniqueViolation(err)) throw nameTaken();
    throw err;
  }
}

// Every function takes the caller's familyId, so a family only ever touches its own products.

export async function list(familyId: number, query: ProductQueryParams): Promise<Product[]> {
  const records = await productRepo.findAll(familyId, query);
  const products = records.map(toProduct);
  return query.status ? products.filter((p) => p.status === query.status) : products;
}

export async function getById(familyId: number, id: number): Promise<Product> {
  const record = await productRepo.findById(id, familyId);
  if (!record) throw productNotFound();
  return toProduct(record);
}

export function create(familyId: number, input: ProductInput): Promise<Product> {
  return guardUniqueName(() =>
    withTransaction(async (client) => {
      const record = await productRepo.create(familyId, input, client);
      await autoAddToShoppingList(record, client);
      return toProduct(record);
    }),
  );
}

export function update(familyId: number, id: number, input: ProductInput): Promise<Product> {
  return guardUniqueName(() =>
    withTransaction(async (client) => {
      const record = await productRepo.update(id, familyId, input, client);
      if (!record) throw productNotFound();
      await autoAddToShoppingList(record, client);
      return toProduct(record);
    }),
  );
}

/**
 * Sets the new quantity (not a delta). Household members may only lower it;
 * raising it happens through a purchase or by the admin.
 */
export function updateQuantity(user: User, id: number, quantity: number): Promise<Product> {
  return withTransaction(async (client: PoolClient) => {
    const current = await productRepo.findById(id, user.familyId, client, { forUpdate: true });
    if (!current) throw productNotFound();

    if (user.role !== 'Admin' && quantity > current.quantity) {
      throw forbidden('בן בית רשאי רק להוריד כמות; הגדלת מלאי נעשית ברכישה או על ידי המנהל');
    }

    const record = await productRepo.setQuantity(id, user.familyId, quantity, client);
    if (!record) throw productNotFound();
    await autoAddToShoppingList(record, client);
    return toProduct(record);
  });
}

export async function remove(familyId: number, id: number): Promise<void> {
  const deleted = await productRepo.remove(id, familyId);
  if (!deleted) throw productNotFound();
}
