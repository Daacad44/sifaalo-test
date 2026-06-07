import prisma from '../config/prisma.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/admin/stats
 * Aggregate counts for the dashboard cards.
 */
export const getStats = asyncHandler(async (_req, res) => {
  const [total, paid, pending, processing, failed] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PAID' } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'PROCESSING' } }),
    prisma.order.count({ where: { status: 'FAILED' } }),
  ]);

  const paidAgg = await prisma.order.aggregate({
    where: { status: 'PAID' },
    _sum: { amount: true },
  });

  res.json({
    success: true,
    data: {
      totalOrders: total,
      successfulPayments: paid,
      pendingPayments: pending + processing,
      failedPayments: failed,
      totalCollected: Number(paidAgg._sum.amount || 0),
    },
  });
});

/**
 * GET /api/admin/orders
 * Paginated, searchable, filterable list of recent transactions.
 */
export const listOrders = asyncHandler(async (req, res) => {
  const { search, status, page, pageSize } = req.query;

  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { id: { contains: search, mode: 'insensitive' } },
            { transactionId: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerEmail: { contains: search, mode: 'insensitive' } },
            { customerPhone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    success: true,
    data: orders.map((o) => ({
      ...o,
      amount: Number(o.amount),
      product: o.product ? { ...o.product, price: Number(o.product.price) } : null,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  });
});
