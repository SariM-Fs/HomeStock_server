// One-time migration for a database created before families existed.
// Moves all existing users and products into a single family, keeping every row.
// Usage: npx tsx src/db/migrateFamilies.ts "משפחת כהן"
import { pool, withTransaction } from './connection';
import * as familyService from '../services/familyService';

async function migrate() {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'family_id'`,
  );
  if (rows.length) {
    console.log('Already migrated: users.family_id exists. Nothing to do.');
    return;
  }

  const family = await withTransaction(async (client) => {
    const family = await familyService.create(process.argv[2] || 'המשפחה שלי', client);

    for (const table of ['users', 'products']) {
      await client.query(`ALTER TABLE ${table} ADD COLUMN family_id INTEGER REFERENCES families (id) ON DELETE CASCADE`);
      await client.query(`UPDATE ${table} SET family_id = $1`, [family.id]);
      await client.query(`ALTER TABLE ${table} ALTER COLUMN family_id SET NOT NULL`);
    }

    // Product names become unique per family instead of globally.
    await client.query('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_key');
    await client.query('ALTER TABLE products ADD CONSTRAINT products_family_id_name_key UNIQUE (family_id, name)');
    return family;
  });

  console.log(`Migrated: all users and products now belong to "${family.name}" (code ${family.code}).`);
}

migrate()
  .catch((err) => {
    console.error('Migration failed, nothing was changed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
