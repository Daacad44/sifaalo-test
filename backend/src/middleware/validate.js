import ApiError from '../utils/ApiError.js';

// Validates a request section ("body" | "query" | "params") against a Zod
// schema and replaces it with the parsed/sanitised result.
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return next(
      ApiError.badRequest('Validation failed', {
        code: 'VALIDATION_ERROR',
        details,
      })
    );
  }
  req[source] = result.data;
  return next();
};

export default validate;
