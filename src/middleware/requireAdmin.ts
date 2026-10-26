import { NextFunction, Request, Response } from 'express';
import { forbidden, unauthorized } from '../errors';

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw unauthorized();
  if (req.user.role !== 'Admin') throw forbidden('פעולה זו מותרת למנהל בלבד');
  next();
}
