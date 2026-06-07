import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  { id: 1, name: 'Test Product A', price: '0.10' },
  { id: 2, name: 'Test Product B', price: '0.10' },
];

async function main() {
  console.log('Seeding products...');

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: { name: product.name, price: product.price },
      create: product,
    });
    console.log(`  upserted product #${product.id} - ${product.name}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
