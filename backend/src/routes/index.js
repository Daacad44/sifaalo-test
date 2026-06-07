import { Router } from 'express';
import config from '../config/index.js';
import productRoutes from './product.routes.js';
import paymentRoutes from './payment.routes.js';
import webhookRoutes from './webhook.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    testMode: config.testMode,
    timestamp: new Date().toISOString(),
  });
});

router.get('/config', (_req, res) => {
  // Only non-sensitive config is ever exposed to clients.
  res.json({
    success: true,
    data: {
      testMode: config.testMode,
      testAmount: config.testAmount,
      provider: 'SifaloPay',
    },
  });
});

router.use('/products', productRoutes);
router.use('/payment', paymentRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/admin', adminRoutes);

export default router;
