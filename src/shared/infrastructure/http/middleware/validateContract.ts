import { ZodTypeAny } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ message: 'Validation error', errors: result.error.flatten() });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res
        .status(400)
        .json({ message: 'Validation error', errors: result.error.flatten() });
    }
    // Express 5 makes req.query a read-only getter, so we mutate in place
    const query = req.query as Record<string, unknown>;
    for (const key of Object.keys(query)) {
      delete query[key];
    }
    Object.assign(query, result.data);
    next();
  };
}
