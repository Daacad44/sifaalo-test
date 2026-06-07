import { Router } from 'express';
import { getStats, listOrders } from '../controllers/admin.controller.js';
import validate from '../middleware/validate.js';
import { listOrdersSchema } from '../utils/validators.js';

const router = Router();

router.get('/stats', getStats);
router.get('/orders', validate(listOrdersSchema, 'query'), listOrders);

export default router;
