import morgan from 'morgan';
import logger from '../config/logger.js';

// Pipe morgan HTTP access logs through winston so everything lands in one place.
const stream = {
  write: (message) => logger.http?.(message.trim()) || logger.info(message.trim()),
};

const format =
  ':method :url :status :res[content-length] - :response-time ms';

const requestLogger = morgan(format, { stream });

export default requestLogger;
