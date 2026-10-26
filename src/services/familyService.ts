import { randomInt } from 'crypto';
import { Queryable } from '../db/connection';
import * as familyRepo from '../repositories/familyRepo';
import { Family } from '../types';

// No 0/O or 1/I, so a code read aloud or copied by hand can't be mistyped.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** Creates a family with a fresh unique invite code. */
export async function create(name: string, db: Queryable): Promise<Family> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const family = await familyRepo.createIfCodeFree(name, generateCode(), db);
    if (family) return family;
  }
  throw new Error('Could not generate a unique family code');
}

export async function getById(id: number): Promise<Family> {
  const family = await familyRepo.findById(id);
  // Can't happen: users.family_id is NOT NULL with a foreign key.
  if (!family) throw new Error(`Family ${id} not found`);
  return family;
}
