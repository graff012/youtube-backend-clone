import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Entertainment', description: 'Entertainment videos' },
    { name: 'Education', description: 'Educational content' },
    { name: 'Gaming', description: 'Video game related content' },
    { name: 'Music', description: 'Music videos and performances' },
    { name: 'News', description: 'News and current events' },
    { name: 'Sports', description: 'Sports highlights and events' },
    { name: 'Technology', description: 'Tech reviews and tutorials' },
    { name: 'Cooking', description: 'Recipes and cooking shows' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }
  
  console.log('Categories have been seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
