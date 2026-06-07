import { Router } from 'express';
import { handleSifaloWebhook } from '../controllers/webhook.controller.js';

const router = Router();

router.post('/sifalopay', handleSifaloWebhook);

export default router;
