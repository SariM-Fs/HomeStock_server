import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, notFound, validationError } from '../errors';
import { toValidationError } from './validate';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(notFound(`הנתיב ${req.method} ${req.path} לא קיים`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    appError = toValidationError(err);
  } else if (isBodyParseError(err)) {
    appError = validationError('גוף הבקשה אינו JSON תקין');
  } else {
    console.error(err);
    appError = new AppError('SERVER_ERROR', 'אירעה שגיאה בשרת, נסו שוב מאוחר יותר');
  }

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.fields ? { fields: appError.fields } : {}),
    },
  });
}

function isBodyParseError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { type?: string }).type === 'entity.parse.failed'
  );
}
