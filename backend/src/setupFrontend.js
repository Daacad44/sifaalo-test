import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import config from './config/index.js';
import logger from './config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '../../frontend');

/**
 * Attach the React storefront to the same Express app as the API.
 * In development this uses Vite middleware; in production it serves the build.
 * One port (4000) serves both UI and /api — fixes preview tunnels that only
 * forward a single port and return 404 for proxied /api routes.
 */
export async function attachFrontend(app) {
  if (!config.isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: frontendRoot,
      configFile: path.join(frontendRoot, 'vite.config.js'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    logger.info(`Vite dev middleware attached (storefront at http://localhost:${config.port})`);
    return;
  }

  const dist = path.join(frontendRoot, 'dist');
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(dist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
  logger.info(`Serving frontend static build from ${dist}`);
}
