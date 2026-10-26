// npm run seed — resets the database and fills it with starting data.
import { autoAddToShoppingList } from '../services/productService';
import { hashPassword } from '../services/authService';
import * as familyService from '../services/familyService';
import * as productRepo from '../repositories/productRepo';
import * as userRepo from '../repositories/userRepo';
import { ProductInput } from '../types';
import { initSchema, pool, withTransaction } from './connection';

const PRODUCTS: ProductInput[] = [
  { name: 'חלב', category: 'מוצרי חלב', quantity: 1, minimumQuantity: 1, unit: 'ליטר' },
  { name: 'גבינה צהובה', category: 'מוצרי חלב', quantity: 3, minimumQuantity: 1, unit: 'חבילות' },
  { name: 'יוגורט', category: 'מוצרי חלב', quantity: 0, minimumQuantity: 4, unit: 'יחידות' },
  { name: 'עגבניות', category: 'ירקות ופירות', quantity: 2, minimumQuantity: 1, unit: 'ק״ג' },
  { name: 'תפוחים', category: 'ירקות ופירות', quantity: 0.5, minimumQuantity: 1, unit: 'ק״ג' },
  { name: 'אורז', category: 'מזון יבש', quantity: 2, minimumQuantity: 1, unit: 'חבילות' },
  { name: 'פסטה', category: 'מזון יבש', quantity: 0, minimumQuantity: 2, unit: 'חבילות' },
  { name: 'מים מינרליים', category: 'שתייה', quantity: 6, minimumQuantity: 6, unit: 'ליטר' },
  { name: 'מיץ תפוזים', category: 'שתייה', quantity: 2, minimumQuantity: 1, unit: 'ליטר' },
  { name: 'נוזל כלים', category: 'ניקיון', quantity: 1, minimumQuantity: 1, unit: 'יחידות' },
  { name: 'נייר טואלט', category: 'ניקיון', quantity: 3, minimumQuantity: 2, unit: 'חבילות' },
  { name: 'סוללות', category: 'אחר', quantity: 8, minimumQuantity: 4, unit: 'יחידות' },
];

async function seed() {
  await pool.query('DROP TABLE IF EXISTS shopping_items, products, users, families CASCADE');
  await initSchema();

  const passwordHash = await hashPassword('123456');

  const family = await withTransaction(async (client) => {
    const family = await familyService.create('משפחת כהן', client);
    const familyId = family.id;

    await userRepo.create({ familyId, username: 'abba', passwordHash, displayName: 'אבא', role: 'Admin' }, client);
    await userRepo.create({ familyId, username: 'yossi', passwordHash, displayName: 'יוסי', role: 'User' }, client);

    for (const input of PRODUCTS) {
      const product = await productRepo.create(familyId, input, client);
      // Same rule as the API: low/missing products start on the shopping list.
      await autoAddToShoppingList(product, client);
    }
    return family;
  });

  console.log(`Seeded family "${family.name}" (code ${family.code}) with 2 users (abba / yossi, password 123456) and ${PRODUCTS.length} products.`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
