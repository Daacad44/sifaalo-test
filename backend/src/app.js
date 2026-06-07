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
app.use(helmet());

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser tools (no origin) and any configured origins.
    if (!origin || config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')) {
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
app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'SifaloPay Mini E-Commerce API',
    docs: '/api/health',
    testMode: config.testMode,
  });
});
app.use('/api', routes);

// --- Error handling ---------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

logger.info(`App initialised (TEST_MODE=${config.testMode})`);

export default app;
