export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SERVER_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500,
};

export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.status = STATUS_BY_CODE[code];
  }
}

export const validationError = (message: string, fields?: Record<string, string>) =>
  new AppError('VALIDATION_ERROR', message, fields);
export const unauthorized = (message = 'נדרשת התחברות') => new AppError('UNAUTHORIZED', message);
export const forbidden = (message = 'אין לך הרשאה לפעולה זו') => new AppError('FORBIDDEN', message);
export const notFound = (message: string) => new AppError('NOT_FOUND', message);
export const conflict = (message: string, fields?: Record<string, string>) =>
  new AppError('CONFLICT', message, fields);

/** True when a pg error is a unique-constraint violation. */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}
