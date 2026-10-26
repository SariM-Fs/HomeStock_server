import { NextFunction, Request, Response } from 'express';
import { forbidden, unauthorized } from '../errors';
import { Permission, User } from '../types';

/** Admins always have every permission; household members need the flag. */
export function hasPermission(user: User, permission: Permission): boolean {
  return user.role === 'Admin' || user[permission];
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw unauthorized();
    if (!hasPermission(req.user, permission)) throw forbidden();
    next();
  };
}
