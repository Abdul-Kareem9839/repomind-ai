import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

/**
 * Validates req.{body,query,params} against a zod schema shaped like:
 *   z.object({ body: z.object({...}), query: z.object({...}) })
 * Only include the keys you actually want validated.
 */
export function validateRequest(schema) {
  return function validate(req, res, next) {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message
        }));
        return next(ApiError.badRequest('Validation failed', details));
      }
      next(err);
    }
  };
}

export default validateRequest;
