import prisma from '../config/prisma.js';
import config from '../config/index.js';
import logger from '../config/logger.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import sifaloPayService from '../services/sifalopay.service.js';

const serializeOrder = (order) => ({
  ...order,
  amount: Number(order.amount),
  payments: order.payments?.map((p) => ({
    ...p,
    amount: Number(p.amount),
  })),
});

/**
 * POST /api/payment/create
 * 1. Validate + look up product
 * 2. Create a PENDING order + payment
 * 3. Ask SifaloPay to create a payment intent
 * 4. Persist transaction id and return checkout details
 */
export const createPayment = asyncHandler(async (req, res) => {
  const { productId, customerName, customerEmail, customerPhone } = req.body;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound('Selected product does not exist');

  const amount = product.price;
  if (Number(amount) <= 0) throw ApiError.badRequest('Invalid amount');

  // Create the order + an associated payment record in one transaction.
  const order = await prisma.order.create({
    data: {
      productId: product.id,
      customerName,
      customerEmail,
      customerPhone,
      amount,
      status: 'PENDING',
      payments: {
        create: { provider: 'sifalopay', amount, status: 'PENDING' },
      },
    },
    include: { payments: true },
  });

  logger.info('Order created', { orderId: order.id, amount: String(amount) });

  let gateway;
  try {
    gateway = await sifaloPayService.createPayment({
      order,
      customerPhone,
      description: `${product.name} (Order ${order.id})`,
    });
  } catch (error) {
    // Mark the order/payment as failed so the record is consistent.
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'FAILED',
        payments: {
          updateMany: {
            where: { orderId: order.id },
            data: { status: 'FAILED' },
          },
        },
      },
    });
    throw error;
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: gateway.status,
      transactionId: gateway.transactionId,
      payments: {
        updateMany: {
          where: { orderId: order.id },
          data: {
            status: gateway.status,
            transactionId: gateway.transactionId,
            rawResponse: gateway.raw,
          },
        },
      },
    },
    include: { payments: true },
  });

  logger.info('Payment intent created', {
    orderId: updated.id,
    transactionId: gateway.transactionId,
    status: gateway.status,
  });

  res.status(201).json({
    success: true,
    data: {
      order: serializeOrder(updated),
      transactionId: gateway.transactionId,
      checkoutUrl: gateway.checkoutUrl || null,
      testMode: config.testMode,
    },
  });
});

/**
 * POST /api/payment/verify
 * Actively poll SifaloPay for the latest status and reconcile the database.
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, transactionId } = req.body;

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        orderId ? { id: orderId } : undefined,
        transactionId ? { transactionId } : undefined,
      ].filter(Boolean),
    },
    include: { payments: true },
  });

  if (!order) throw ApiError.notFound('Order not found');
  if (!order.transactionId) {
    throw ApiError.badRequest('This order has no transaction to verify yet');
  }

  const result = await sifaloPayService.verifyPayment(order.transactionId);

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: result.status,
      payments: {
        updateMany: {
          where: { orderId: order.id },
          data: { status: result.status, rawResponse: result.raw },
        },
      },
    },
    include: { payments: true },
  });

  res.json({ success: true, data: serializeOrder(updated) });
});

/**
 * GET /api/payment/status/:id
 * Returns the current order + payment details (by order id or transaction id).
 */
export const getPaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await prisma.order.findFirst({
    where: { OR: [{ id }, { transactionId: id }] },
    include: { payments: true, product: true },
  });

  if (!order) throw ApiError.notFound('Order not found');

  res.json({
    success: true,
    data: {
      ...serializeOrder(order),
      product: order.product
        ? { ...order.product, price: Number(order.product.price) }
        : null,
      paymentMethod: 'SifaloPay',
    },
  });
});

/**
 * POST /api/payment/simulate (TEST MODE only)
 * Convenience endpoint that mimics SifaloPay firing a webhook so the full
 * workflow can be tested without the real provider.
 */
export const simulatePayment = asyncHandler(async (req, res) => {
  if (!config.testMode) {
    throw ApiError.badRequest('Simulation is only available in TEST MODE');
  }

  const { orderId, outcome = 'PAID' } = req.body || {};
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw ApiError.notFound('Order not found');
  if (!order.transactionId) {
    throw ApiError.badRequest('Order has no transaction id to simulate');
  }

  const { payload, signature } = sifaloPayService.buildSimulatedWebhook(
    order,
    outcome
  );

  res.json({
    success: true,
    message: 'Use this payload to call POST /api/webhooks/sifalopay',
    data: { payload, signature },
  });
});
