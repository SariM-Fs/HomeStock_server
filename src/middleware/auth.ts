import { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../errors';
import * as authService from '../services/authService';

/**
 * Verifies the Bearer token and loads the user fresh from the database,
 * so permission changes take effect immediately.
 */
export async function auth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw unauthorized();
  }

  req.user = await authService.getUserFromToken(match[1].trim());
  next();
}
