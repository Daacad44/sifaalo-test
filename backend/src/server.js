import app from './app.js';
import config from './config/index.js';
import logger from './config/logger.js';
import prisma from './config/prisma.js';

const server = app.listen(config.port, () => {
  logger.info(`SifaloPay backend listening on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.env} | TEST_MODE: ${config.testMode}`);
});

const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Closed out remaining connections. Bye.');
    process.exit(0);
  });
  // Force-exit if it hangs.
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason: String(reason) });
});

export default server;
