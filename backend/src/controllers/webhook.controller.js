import prisma from '../config/prisma.js';
import logger from '../config/logger.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import sifaloPayService, {
  SifaloPayService,
} from '../services/sifalopay.service.js';

/**
 * POST /api/webhooks/sifalopay
 *
 * Secure webhook receiver:
 *  - validates the HMAC signature
 *  - logs every payload to the WebhookEvent table
 *  - prevents duplicate processing (idempotency)
 *  - updates the related order + payment
 */
export const handleSifaloWebhook = asyncHandler(async (req, res) => {
  // `req.rawBody` is captured by the express.json verify hook so the signature
  // is computed against the EXACT bytes SifaloPay sent.
  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const signature =
    req.get('x-sifalo-signature') ||
    req.get('x-signature') ||
    req.body?.signature;

  const payload = req.body || {};
  const data = payload.data || payload;

  // Derive a stable event id for idempotency.
  const eventId =
    payload.event_id ||
    payload.id ||
    data.transaction_id ||
    data.transactionId ||
    `${data.reference || 'unknown'}:${payload.event || data.status || 'event'}`;

  logger.info('Webhook received', { eventId, event: payload.event });

  // 1. Validate signature.
  const valid = sifaloPayService.verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    await prisma.webhookEvent.create({
      data: { eventId: `${eventId}:invalid:${Date.now()}`, payload, signature, processed: false },
    });
    logger.warn('Webhook rejected: invalid signature', { eventId });
    throw ApiError.unauthorized('Invalid webhook signature');
  }

  // 2. Idempotency: if we've already processed this event, acknowledge & exit.
  const existing = await prisma.webhookEvent.findUnique({ where: { eventId } });
  if (existing?.processed) {
    logger.info('Duplicate webhook ignored', { eventId });
    return res.json({ success: true, message: 'Already processed', duplicate: true });
  }

  // 3. Log the raw event (create if new, otherwise reuse the record).
  const event = existing
    ? existing
    : await prisma.webhookEvent.create({
        data: { eventId, payload, signature, processed: false },
      });

  // 4. Locate the order.
  const reference = data.reference || data.order_id || data.orderId;
  const transactionId = data.transaction_id || data.transactionId;

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        reference ? { id: reference } : undefined,
        transactionId ? { transactionId } : undefined,
      ].filter(Boolean),
    },
  });

  if (!order) {
    logger.warn('Webhook for unknown order', { eventId, reference, transactionId });
    // Still 200 so the provider does not endlessly retry an unknown reference.
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processed: true },
    });
    return res.json({ success: true, message: 'No matching order' });
  }

  // 5. Map status + update order/payment atomically.
  const status = mapWebhookStatus(payload, data);

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        status,
        transactionId: transactionId || order.transactionId,
      },
    }),
    prisma.payment.updateMany({
      where: { orderId: order.id },
      data: {
        status,
        transactionId: transactionId || order.transactionId,
        rawResponse: payload,
      },
    }),
    prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processed: true },
    }),
  ]);

  logger.info('Webhook processed', { eventId, orderId: order.id, status });

  res.json({ success: true, message: 'Webhook processed', orderId: order.id, status });
});

function mapWebhookStatus(payload, data) {
  const raw = String(payload.event || data.status || '').toLowerCase();
  if (raw.includes('paid') || raw.includes('success') || raw.includes('complete') || raw.includes('approved')) {
    return 'PAID';
  }
  if (raw.includes('fail') || raw.includes('declin') || raw.includes('reject') || raw.includes('cancel')) {
    return 'FAILED';
  }
  if (raw.includes('process')) return 'PROCESSING';
  return 'PENDING';
}

// Re-export for potential reuse/testing.
export { SifaloPayService };
