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

  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  testMode: toBool(process.env.TEST_MODE, true),
  testAmount: process.env.TEST_AMOUNT || '0.10',

  sifalo: {
    // Merchant dashboard → https://pay.sifalo.com/business/merchant/api
    apiUsername:
      process.env.SIFALO_API_USERNAME ||
      process.env.SIFALO_API_USER ||
      '',
    apiKey: process.env.SIFALO_API_KEY || '',
    gatewayUrl:
      process.env.SIFALO_GATEWAY_URL || 'https://api.sifalopay.com/gateway/',
    verifyUrl:
      process.env.SIFALO_VERIFY_URL ||
      'https://api.sifalopay.com/gateway/verify.php',
    storeUrl: process.env.SIFALO_STORE_URL || 'http://localhost:4000',
    currency: process.env.SIFALO_CURRENCY || 'USD',
    channel: process.env.SIFALO_CHANNEL || 'api',
    webhookSecret: process.env.SIFALO_WEBHOOK_SECRET || '',
    callbackUrl:
      process.env.SIFALO_CALLBACK_URL ||
      'http://localhost:4000/api/webhooks/sifalopay',
    returnUrl: process.env.SIFALO_RETURN_URL || 'http://localhost:4000/status',
    timeoutMs: Number(process.env.SIFALO_TIMEOUT_MS) || 45000,
  },
};

config.isProd = config.env === 'production';

export default config;
