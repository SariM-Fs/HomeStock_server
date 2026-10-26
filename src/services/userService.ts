import { forbidden, notFound } from '../errors';
import * as userRepo from '../repositories/userRepo';
import { PermissionsBody } from '../schemas/userSchemas';
import { User } from '../types';
import { toPublicUser } from './authService';

/** The members of one family. */
export async function list(familyId: number): Promise<User[]> {
  const records = await userRepo.findAll(familyId);
  return records.map(toPublicUser);
}

/** The admin can toggle the permission flags of anyone in their family, but not their own. */
export async function updatePermissions(actor: User, id: number, changes: PermissionsBody): Promise<User> {
  if (actor.id === id) {
    throw forbidden('מנהל אינו יכול לשנות את ההרשאות של עצמו');
  }

  const record = await userRepo.updatePermissions(id, actor.familyId, changes);
  if (!record) throw notFound('המשתמש לא נמצא');
  return toPublicUser(record);
}
