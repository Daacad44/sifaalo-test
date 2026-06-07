import { z } from 'zod';
import { PAYMENT_METHOD_IDS } from '../constants/paymentMethods.js';

// East-African friendly phone validation: optional +, country code, 7-14 digits.
const phoneRegex = /^\+?[0-9]{7,15}$/;

export const createPaymentSchema = z.object({
  productId: z.coerce
    .number({ invalid_type_error: 'productId must be a number' })
    .int()
    .positive(),
  customerName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(120),
  customerEmail: z
    .string()
    .trim()
    .email('A valid email address is required')
    .max(180),
  customerPhone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Invalid phone number. Use digits only, e.g. 252612345678'),
  paymentMethod: z
    .enum(PAYMENT_METHOD_IDS, {
      errorMap: () => ({
        message: `paymentMethod must be one of: ${PAYMENT_METHOD_IDS.join(', ')}`,
      }),
    })
    .default('evc_plus'),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().trim().min(1, 'orderId is required').optional(),
  transactionId: z.string().trim().min(1).optional(),
}).refine((data) => data.orderId || data.transactionId, {
  message: 'Provide an orderId or transactionId to verify',
});

export const listOrdersSchema = z.object({
  search: z.string().trim().max(180).optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'PAID', 'FAILED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
