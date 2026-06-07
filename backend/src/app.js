import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import config from './config/index.js';
import logger from './config/logger.js';
import requestLogger from './middleware/requestLogger.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

app.set('trust proxy', 1);

// --- Security ---------------------------------------------------------------
app.use(
  config.isProd
    ? helmet()
    : helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })
);

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser tools (no origin) and any configured origins.
    if (!origin || config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')) {
      return callback(null, true);
    }
    // In development, accept any browser origin (preview tunnels, 127.0.0.1, etc.).
    if (!config.isProd) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
};
app.use(cors(corsOptions));

// --- Parsing / perf ---------------------------------------------------------
// Capture the raw body so webhook signatures can be verified byte-for-byte.
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// --- Logging + rate limiting ------------------------------------------------
app.use(requestLogger);
app.use('/api', apiLimiter);

// --- Routes -----------------------------------------------------------------
app.use('/api', routes);
// Unmatched API paths return JSON 404 (not the SPA HTML page).
app.use('/api', notFoundHandler);

logger.info(`App initialised (TEST_MODE=${config.testMode})`);

export default app;
export { errorHandler };
