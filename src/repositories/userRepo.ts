import { pool, Queryable } from '../db/connection';
import { Permission, Role, UserRecord } from '../types';

const COLUMNS = `
  id,
  family_id                AS "familyId",
  username,
  password_hash            AS "passwordHash",
  display_name             AS "displayName",
  role,
  can_update_quantity      AS "canUpdateQuantity",
  can_add_to_shopping_list AS "canAddToShoppingList",
  can_mark_purchased       AS "canMarkPurchased"`;

const PERMISSION_COLUMNS: Record<Permission, string> = {
  canUpdateQuantity: 'can_update_quantity',
  canAddToShoppingList: 'can_add_to_shopping_list',
  canMarkPurchased: 'can_mark_purchased',
};

export async function findById(id: number, db: Queryable = pool): Promise<UserRecord | null> {
  const { rows } = await db.query<UserRecord>(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findByUsername(username: string, db: Queryable = pool): Promise<UserRecord | null> {
  const { rows } = await db.query<UserRecord>(`SELECT ${COLUMNS} FROM users WHERE username = $1`, [
    username,
  ]);
  return rows[0] ?? null;
}

export async function findAll(familyId: number, db: Queryable = pool): Promise<UserRecord[]> {
  const { rows } = await db.query<UserRecord>(`SELECT ${COLUMNS} FROM users WHERE family_id = $1 ORDER BY id`, [
    familyId,
  ]);
  return rows;
}

export interface NewUser {
  familyId: number;
  username: string;
  passwordHash: string;
  displayName: string;
  role: Role;
}

/** New users get all three permissions on (the column defaults). */
export async function create(user: NewUser, db: Queryable = pool): Promise<UserRecord> {
  const { rows } = await db.query<UserRecord>(
    `INSERT INTO users (family_id, username, password_hash, display_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [user.familyId, user.username, user.passwordHash, user.displayName, user.role],
  );
  return rows[0];
}

/** Only touches a user in the given family; returns null for anyone else. */
export async function updatePermissions(
  id: number,
  familyId: number,
  changes: Partial<Record<Permission, boolean>>,
  db: Queryable = pool,
): Promise<UserRecord | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(changes) as [Permission, boolean | undefined][]) {
    if (value === undefined) continue;
    values.push(value);
    sets.push(`${PERMISSION_COLUMNS[key]} = $${values.length}`);
  }
  if (sets.length === 0) {
    const user = await findById(id, db);
    return user?.familyId === familyId ? user : null;
  }

  values.push(id, familyId);
  const { rows } = await db.query<UserRecord>(
    `UPDATE users SET ${sets.join(', ')}
     WHERE id = $${values.length - 1} AND family_id = $${values.length}
     RETURNING ${COLUMNS}`,
    values,
  );
  return rows[0] ?? null;
}
