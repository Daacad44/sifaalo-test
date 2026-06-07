import app, { errorHandler } from './app.js';
import config from './config/index.js';
import logger from './config/logger.js';
import prisma from './config/prisma.js';
import { attachFrontend } from './setupFrontend.js';

async function start() {
  // Vite (dev) or static build (prod) on the same port as /api.
  await attachFrontend(app);
  app.use(errorHandler);

  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(`SifaloPay app listening on http://localhost:${config.port}`);
    logger.info(`Environment: ${config.env} | TEST_MODE: ${config.testMode}`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Closed out remaining connections. Bye.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason: String(reason) });
  });

  return server;
}

start().catch((err) => {
  logger.error('Failed to start server', { error: String(err) });
  process.exit(1);
});
