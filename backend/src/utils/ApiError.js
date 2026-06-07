// Lightweight typed error used across the API so the central error handler can
// translate failures into consistent, user-friendly JSON responses.
export default class ApiError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || 'ERROR';
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message, opts) {
    return new ApiError(400, message, { code: 'BAD_REQUEST', ...opts });
  }

  static unauthorized(message = 'Unauthorized', opts) {
    return new ApiError(401, message, { code: 'UNAUTHORIZED', ...opts });
  }

  static notFound(message = 'Resource not found', opts) {
    return new ApiError(404, message, { code: 'NOT_FOUND', ...opts });
  }

  static conflict(message, opts) {
    return new ApiError(409, message, { code: 'CONFLICT', ...opts });
  }

  static payment(message, opts) {
    return new ApiError(402, message, { code: 'PAYMENT_ERROR', ...opts });
  }

  static gateway(message, opts) {
    return new ApiError(502, message, { code: 'GATEWAY_ERROR', ...opts });
  }
}
