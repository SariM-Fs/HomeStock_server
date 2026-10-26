import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { validationError } from '../errors';

/** Converts a ZodError into the uniform VALIDATION_ERROR response. */
export function toValidationError(err: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in fields)) fields[key] = issue.message;
  }
  return validationError(err.issues[0]?.message ?? 'בקשה לא תקינה', fields);
}

function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

/** Validates the request body and replaces it with the parsed (trimmed, stripped) value. */
export function validateBody(schema: z.ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = parse(schema, req.body ?? {});
    next();
  };
}

/**
 * Validates the query string and stores the parsed value in res.locals.query
 * (Express 5's req.query is read-only).
 */
export function validateQuery(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.locals.query = parse(schema, req.query);
    next();
  };
}

/** Validates route params and stores the parsed value in res.locals.params. */
export function validateParams(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.locals.params = parse(schema, req.params);
    next();
  };
}
