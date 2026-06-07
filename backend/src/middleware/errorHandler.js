import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.originalUrl} not found` },
  });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  let error = err;

  // Normalise Prisma's well-known errors into friendly responses.
  if (err?.code === 'P2002') {
    error = ApiError.conflict('A record with this value already exists.');
  } else if (err?.code === 'P2025') {
    error = ApiError.notFound('The requested record was not found.');
  }

  if (!(error instanceof ApiError)) {
    error = new ApiError(error.statusCode || 500, error.message || 'Internal Server Error');
  }

  const payload = {
    success: false,
    error: {
      code: error.code || 'ERROR',
      message: error.statusCode >= 500 && !error.expose
        ? 'Something went wrong. Please try again.'
        : error.message,
    },
  };

  if (error.details) payload.error.details = error.details;

  if (error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`, {
      stack: err.stack,
    });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${error.message}`);
  }

  res.status(error.statusCode || 500).json(payload);
};
