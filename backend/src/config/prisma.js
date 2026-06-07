import { PrismaClient } from '@prisma/client';
import config from './index.js';

const prisma = new PrismaClient({
  log: config.isProd ? ['error', 'warn'] : ['error', 'warn'],
});

export default prisma;
