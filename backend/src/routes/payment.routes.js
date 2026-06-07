import { Router } from 'express';
import {
  createPayment,
  verifyPayment,
  getPaymentStatus,
  simulatePayment,
} from '../controllers/payment.controller.js';
import validate from '../middleware/validate.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';
import {
  createPaymentSchema,
  verifyPaymentSchema,
} from '../utils/validators.js';

const router = Router();

router.post('/create', paymentLimiter, validate(createPaymentSchema), createPayment);
router.post('/verify', validate(verifyPaymentSchema), verifyPayment);
router.post('/simulate', simulatePayment);
router.get('/status/:id', getPaymentStatus);

export default router;
