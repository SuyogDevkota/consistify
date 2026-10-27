import { AppError } from '../utils/AppError.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      return next(
        new AppError('Validation failed', 400, 'VALIDATION_ERROR', error.details.map((d) => d.message))
      );
    }
    req[source] = value;
    return next();
  };
}
