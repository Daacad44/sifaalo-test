import dotenv from 'dotenv';

dotenv.config();

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  logLevel: process.env.LOG_LEVEL || 'info',

  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  testMode: toBool(process.env.TEST_MODE, true),
  testAmount: process.env.TEST_AMOUNT || '0.10',

  sifalo: {
    apiKey: process.env.SIFALO_API_KEY || '',
    secretKey: process.env.SIFALO_SECRET_KEY || '',
    baseUrl: process.env.SIFALO_BASE_URL || 'https://api.sifalopay.com',
    merchantId: process.env.SIFALO_MERCHANT_ID || '',
    createPath: process.env.SIFALO_CREATE_PATH || '/v1/payments',
    verifyPath: process.env.SIFALO_VERIFY_PATH || '/v1/payments',
    webhookSecret: process.env.SIFALO_WEBHOOK_SECRET || '',
    callbackUrl:
      process.env.SIFALO_CALLBACK_URL ||
      'http://localhost:4000/api/webhooks/sifalopay',
    returnUrl: process.env.SIFALO_RETURN_URL || 'http://localhost:5173/status',
    timeoutMs: Number(process.env.SIFALO_TIMEOUT_MS) || 15000,
  },
};

config.isProd = config.env === 'production';

export default config;
