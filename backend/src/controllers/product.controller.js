import prisma from '../config/prisma.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const listProducts = asyncHandler(async (_req, res) => {
  const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
  res.json({
    success: true,
    data: products.map((p) => ({ ...p, price: Number(p.price) })),
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw ApiError.badRequest('Invalid product id');

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw ApiError.notFound('Product not found');

  res.json({ success: true, data: { ...product, price: Number(product.price) } });
});
