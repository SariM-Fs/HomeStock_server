import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { withTransaction } from '../db/connection';
import { conflict, isUniqueViolation, unauthorized, validationError } from '../errors';
import * as familyRepo from '../repositories/familyRepo';
import * as userRepo from '../repositories/userRepo';
import { LoginBody, RegisterBody } from '../schemas/authSchemas';
import { Family, User, UserRecord } from '../types';
import * as familyService from './familyService';

const BCRYPT_ROUNDS = 10;
// Compared against when the username doesn't exist, so response time doesn't reveal valid usernames.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

export interface AuthResult {
  token: string;
  user: User;
  family: Family;
}

export function toPublicUser(record: UserRecord): User {
  const { passwordHash: _omit, ...user } = record;
  return user;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export async function login({ username, password }: LoginBody): Promise<AuthResult> {
  const record = await userRepo.findByUsername(username);
  const valid = await bcrypt.compare(password, record?.passwordHash ?? DUMMY_HASH);
  if (!record || !valid) {
    throw unauthorized('שם משתמש או סיסמה שגויים');
  }
  const family = await familyService.getById(record.familyId);
  return { token: signToken(record.id), user: toPublicUser(record), family };
}

const usernameTaken = () => conflict('שם המשתמש כבר תפוס', { username: 'שם המשתמש כבר תפוס' });

/**
 * With familyName: creates a new family and the user becomes its Admin.
 * With familyCode: joins that family as a regular member (role User).
 */
export async function register({
  username,
  password,
  displayName,
  familyName,
  familyCode,
}: RegisterBody): Promise<AuthResult> {
  if (await userRepo.findByUsername(username)) throw usernameTaken();
  const passwordHash = await hashPassword(password);

  let result: { record: UserRecord; family: Family };
  try {
    result = await withTransaction(async (client) => {
      let family: Family;
      if (familyCode) {
        const found = await familyRepo.findByCode(familyCode, client);
        if (!found) throw validationError('קוד המשפחה לא נמצא', { familyCode: 'קוד המשפחה לא נמצא' });
        family = found;
      } else {
        family = await familyService.create(familyName!, client);
      }

      const record = await userRepo.create(
        { familyId: family.id, username, passwordHash, displayName, role: familyCode ? 'User' : 'Admin' },
        client,
      );
      return { record, family };
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw usernameTaken();
    throw err;
  }

  return { token: signToken(result.record.id), user: toPublicUser(result.record), family: result.family };
}

/** Verifies a token and returns the current user from the database. */
export async function getUserFromToken(token: string): Promise<User> {
  let userId: number;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    userId = typeof payload === 'object' ? Number(payload.sub) : NaN;
  } catch {
    throw unauthorized('ההתחברות פגה או אינה תקפה, יש להתחבר מחדש');
  }

  if (!Number.isInteger(userId)) throw unauthorized('ההתחברות אינה תקפה, יש להתחבר מחדש');

  const record = await userRepo.findById(userId);
  if (!record) throw unauthorized('המשתמש לא קיים, יש להתחבר מחדש');
  return toPublicUser(record);
}
