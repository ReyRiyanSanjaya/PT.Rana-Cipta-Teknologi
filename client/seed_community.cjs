
const { PrismaClient } = require('d:/rana/server/node_modules/@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:simpledark67@localhost:5432/rana_pos?schema=public',
    },
  },
});

async function main() {
  try {
    console.log('Starting seed...');
    
    // 1. Get or Create Tenant
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('Creating dummy tenant...');
      tenant = await prisma.tenant.create({
        data: {
          name: 'Demo Tenant',
          plan: 'FREE'
        }
      });
    }
    console.log('Tenant ID:', tenant.id);

    // 2. Get or Create User
    let user = await prisma.user.findFirst();
    if (!user) {
      console.log('Creating dummy user...');
      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: 'demo@rana.com',
          name: 'Demo User',
          passwordHash: 'hashed_password_placeholder',
          role: 'OWNER'
        }
      });
    }
    console.log('User ID:', user.id);

    // 3. Get or Create Topic
    let topic = await prisma.communityTopic.findFirst();
    if (!topic) {
      console.log('Creating dummy topic...');
      topic = await prisma.communityTopic.create({
        data: {
          title: 'Umum',
          description: 'Diskusi umum',
          icon: 'MessageCircle'
        }
      });
    }
    console.log('Topic ID:', topic.id);

    // 4. Create Posts
    const tagsList = [
      ['Bisnis', 'Startup', 'Modal'],
      ['Teknologi', 'AI', 'Coding'],
      ['Bisnis', 'Marketing'],
      ['Keuangan', 'Investasi'],
      ['Teknologi', 'Gadget'],
      ['Bisnis', 'Manajemen'],
      ['Legalitas', 'Hukum'],
      ['Bisnis', 'Startup'],
      ['Marketing', 'SocialMedia'],
      ['Lifestyle', 'WorkLifeBalance'],
      ['Bisnis', 'Franchise'],
      ['Teknologi', 'SaaS']
    ];

    console.log('Creating posts...');
    for (let i = 0; i < tagsList.length; i++) {
      await prisma.communityPost.create({
        data: {
          title: `Postingan Diskusi ${i + 1}`,
          content: `Ini adalah konten diskusi tentang ${tagsList[i].join(', ')}. Mari kita bahas lebih lanjut mengenai topik ini.`,
          tags: tagsList[i],
          authorId: user.id,
          topicId: topic.id
        }
      });
    }
    
    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error during seed:', error);
    process.exit(1);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
