const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// ============================================
// SEED: Distributor Acquisition Map Demo Data
// ============================================
// Creates:
// - 1 Distributor account (if not exists)
// - 25 Merchant tenants with GPS coordinates around Medan
// - Wholesale products & categories
// - Wholesale orders (some merchants active, some leads)
// - DistributorCustomer relations with credit limits

const DISTRIBUTOR_EMAIL = 'distributor@rana.com';
const DISTRIBUTOR_PASSWORD = 'password123';
const DISTRIBUTOR_COMPANY = 'PT Rana Distribusi Nusantara';

// Medan area merchants with realistic coordinates
const MERCHANT_DATA = [
  { name: 'Warung Maju Jaya', owner: 'Budi Santoso', category: 'Warung', lat: 3.5952, lng: 98.6722, location: 'Medan Baru', phone: '6281234567001' },
  { name: 'Toko Berkah Sejahtera', owner: 'Siti Aminah', category: 'Toko Kelontong', lat: 3.5870, lng: 98.6650, location: 'Medan Petisah', phone: '6281234567002' },
  { name: 'Kedai Kopi Nusantara', owner: 'Ahmad Rizki', category: 'Kedai Kopi', lat: 3.5800, lng: 98.6900, location: 'Medan Kota', phone: '6281234567003' },
  { name: 'Minimarket Sinar Baru', owner: 'Dewi Lestari', category: 'Minimarket', lat: 3.5400, lng: 98.6700, location: 'Medan Johor', phone: '6281234567004' },
  { name: 'Apotek Sehat Selalu', owner: 'Dr. Hendra', category: 'Apotek', lat: 3.5750, lng: 98.6200, location: 'Medan Sunggal', phone: '6281234567005' },
  { name: 'Rumah Makan Padang Raya', owner: 'Yusuf Hakim', category: 'Rumah Makan', lat: 3.5913, lng: 98.6775, location: 'Medan Baru', phone: '6281234567006' },
  { name: 'Toko Bangunan Jaya', owner: 'Hasan Basri', category: 'Toko Bangunan', lat: 3.5866, lng: 98.6744, location: 'Medan Petisah', phone: '6281234567007' },
  { name: 'Warung Nasi Ibu Rani', owner: 'Rani Susanti', category: 'Warung', lat: 3.6000, lng: 98.6600, location: 'Medan Helvetia', phone: '6281234567008' },
  { name: 'Kedai Es Teh Manis', owner: 'Eko Prasetyo', category: 'Kedai Kopi', lat: 3.5650, lng: 98.6450, location: 'Medan Sunggal', phone: '6281234567009' },
  { name: 'Toko Sembako Murah', owner: 'Lina Marlina', category: 'Toko Kelontong', lat: 3.5550, lng: 98.6850, location: 'Medan Johor', phone: '6281234567010' },
  { name: 'Bakso Pak Kumis', owner: 'Kumis Sugiarto', category: 'Warung', lat: 3.5980, lng: 98.6500, location: 'Medan Baru', phone: '6281234567011' },
  { name: 'Laundry Express Clean', owner: 'Maya Sari', category: 'Laundry', lat: 3.5720, lng: 98.6380, location: 'Medan Sunggal', phone: '6281234567012' },
  { name: 'Toko Elektronik Jago', owner: 'Rudi Hartono', category: 'Elektronik', lat: 3.5830, lng: 98.7050, location: 'Medan Kota', phone: '6281234567013' },
  { name: 'Warung Sate Madura', owner: 'Abdul Karim', category: 'Warung', lat: 3.5480, lng: 98.6550, location: 'Medan Johor', phone: '6281234567014' },
  { name: 'Salon Cantik Alami', owner: 'Fitri Handayani', category: 'Salon', lat: 3.5920, lng: 98.6820, location: 'Medan Petisah', phone: '6281234567015' },
  { name: 'Toko Plastik Mega', owner: 'Agus Setiawan', category: 'Toko Kelontong', lat: 3.6050, lng: 98.6680, location: 'Medan Helvetia', phone: '6281234567016' },
  { name: 'Bengkel Motor Cepat', owner: 'Joko Widodo', category: 'Bengkel', lat: 3.5350, lng: 98.6950, location: 'Medan Johor', phone: '6281234567017' },
  { name: 'Kedai Mie Ayam Pak To', owner: 'Tono Suparman', category: 'Warung', lat: 3.5780, lng: 98.6580, location: 'Medan Baru', phone: '6281234567018' },
  { name: 'Toko Kue Lezat', owner: 'Indah Permata', category: 'Toko Kue', lat: 3.5690, lng: 98.6720, location: 'Medan Petisah', phone: '6281234567019' },
  { name: 'Warung Pecel Lele 99', owner: 'Suparno', category: 'Warung', lat: 3.5510, lng: 98.6420, location: 'Medan Sunggal', phone: '6281234567020' },
  { name: 'Toko Obat Herbal Sehat', owner: 'Hj. Nurhasanah', category: 'Apotek', lat: 3.5960, lng: 98.6950, location: 'Medan Kota', phone: '6281234567021' },
  { name: 'Fotocopy & ATK Pintar', owner: 'Bambang Irawan', category: 'ATK', lat: 3.5840, lng: 98.6480, location: 'Medan Baru', phone: '6281234567022' },
  { name: 'Warung Seafood Bahari', owner: 'Nelayan Jaya', category: 'Rumah Makan', lat: 3.5620, lng: 98.7100, location: 'Medan Kota', phone: '6281234567023' },
  { name: 'Toko Pupuk Tani Makmur', owner: 'Pak Tani', category: 'Pertanian', lat: 3.5300, lng: 98.6300, location: 'Medan Sunggal', phone: '6281234567024' },
  { name: 'Kedai Juice Segar', owner: 'Rina Wati', category: 'Kedai Kopi', lat: 3.5890, lng: 98.6610, location: 'Medan Petisah', phone: '6281234567025' },
];

// Wholesale product categories
const CATEGORIES = [
  'Makanan & Minuman',
  'Sembako',
  'Kebersihan & Rumah Tangga',
  'Snack & Camilan',
  'Minuman Kemasan',
];

// Wholesale products
const PRODUCTS = [
  { name: 'Indomie Goreng (1 Karton)', category: 'Makanan & Minuman', price: 115000, stock: 200, unit: 'karton', moq: 5 },
  { name: 'Minyak Goreng Bimoli 2L (1 Dus)', category: 'Sembako', price: 180000, stock: 150, unit: 'dus', moq: 3 },
  { name: 'Gula Pasir 1kg (1 Sak)', category: 'Sembako', price: 14500, stock: 500, unit: 'kg', moq: 10 },
  { name: 'Beras Premium 5kg', category: 'Sembako', price: 72000, stock: 300, unit: 'sak', moq: 5 },
  { name: 'Sabun Cuci Rinso 900g (1 Dus)', category: 'Kebersihan & Rumah Tangga', price: 156000, stock: 100, unit: 'dus', moq: 2 },
  { name: 'Teh Botol Sosro 450ml (1 Krat)', category: 'Minuman Kemasan', price: 52000, stock: 250, unit: 'krat', moq: 5 },
  { name: 'Aqua 600ml (1 Dus)', category: 'Minuman Kemasan', price: 48000, stock: 400, unit: 'dus', moq: 5 },
  { name: 'Chitato 68g (1 Karton)', category: 'Snack & Camilan', price: 96000, stock: 180, unit: 'karton', moq: 3 },
  { name: 'Kopi Kapal Api Special (1 Renceng)', category: 'Makanan & Minuman', price: 28000, stock: 600, unit: 'renceng', moq: 10 },
  { name: 'Susu Ultra Milk 1L (1 Dus)', category: 'Minuman Kemasan', price: 108000, stock: 120, unit: 'dus', moq: 3 },
  { name: 'Tepung Terigu Segitiga Biru 1kg', category: 'Sembako', price: 12500, stock: 400, unit: 'kg', moq: 10 },
  { name: 'Sunlight Pencuci Piring 800ml (1 Dus)', category: 'Kebersihan & Rumah Tangga', price: 132000, stock: 90, unit: 'dus', moq: 2 },
  { name: 'Pop Mie (1 Karton)', category: 'Makanan & Minuman', price: 88000, stock: 160, unit: 'karton', moq: 3 },
  { name: 'Telur Ayam 1kg', category: 'Sembako', price: 28000, stock: 1000, unit: 'kg', moq: 5 },
  { name: 'Pocari Sweat 500ml (1 Dus)', category: 'Minuman Kemasan', price: 72000, stock: 200, unit: 'dus', moq: 3 },
];

// Helpers
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - getRandomInt(0, daysAgo));
  d.setHours(getRandomInt(6, 22), getRandomInt(0, 59), 0, 0);
  return d;
};

async function main() {
  console.log('🌱 Seeding Distributor Acquisition Map Demo Data...\n');

  // =====================
  // 1. CREATE DISTRIBUTOR
  // =====================
  console.log('📦 Creating Distributor Account...');
  
  let distributorUser = await prisma.user.findUnique({ where: { email: DISTRIBUTOR_EMAIL } });
  let distributor;

  if (distributorUser) {
    distributor = await prisma.distributor.findFirst({ where: { userId: distributorUser.id } });
    console.log(`   ⚠️  Distributor already exists: ${DISTRIBUTOR_EMAIL}`);
  } else {
    const hashedPassword = await bcrypt.hash(DISTRIBUTOR_PASSWORD, 10);

    const distTenant = await prisma.tenant.create({
      data: {
        name: DISTRIBUTOR_COMPANY,
        plan: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
      }
    });

    distributorUser = await prisma.user.create({
      data: {
        email: DISTRIBUTOR_EMAIL,
        name: 'Admin Distributor',
        passwordHash: hashedPassword,
        role: 'DISTRIBUTOR',
        tenantId: distTenant.id,
      }
    });

    distributor = await prisma.distributor.create({
      data: {
        userId: distributorUser.id,
        companyName: DISTRIBUTOR_COMPANY,
        npwp: '12.345.678.9-012.000',
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        balance: 50000000,
      }
    });

    // Create warehouse
    await prisma.warehouse.create({
      data: {
        distributorId: distributor.id,
        name: 'Gudang Utama Medan',
        address: 'Jl. Gatot Subroto No. 88, Medan',
        isPrimary: true,
      }
    });

    console.log(`   ✅ Distributor: ${DISTRIBUTOR_EMAIL} / ${DISTRIBUTOR_PASSWORD}`);
  }

  if (!distributor) {
    console.error('❌ Failed to find/create distributor');
    return;
  }

  // =====================
  // 2. CREATE CATEGORIES
  // =====================
  console.log('\n📂 Creating Wholesale Categories...');
  const categoryMap = {};

  for (const catName of CATEGORIES) {
    const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await prisma.wholesaleCategory.findFirst({ where: { name: catName } });
    if (existing) {
      categoryMap[catName] = existing.id;
    } else {
      const cat = await prisma.wholesaleCategory.create({
        data: { name: catName, slug }
      });
      categoryMap[catName] = cat.id;
    }
  }
  console.log(`   ✅ ${CATEGORIES.length} categories ready`);

  // =====================
  // 3. CREATE PRODUCTS
  // =====================
  console.log('\n🏷️  Creating Wholesale Products...');
  const productIds = [];

  for (const prod of PRODUCTS) {
    const existing = await prisma.wholesaleProduct.findFirst({
      where: { name: prod.name, distributorId: distributor.id }
    });

    if (existing) {
      productIds.push(existing.id);
    } else {
      const product = await prisma.wholesaleProduct.create({
        data: {
          distributorId: distributor.id,
          name: prod.name,
          description: `${prod.name} - Harga grosir terbaik`,
          wholesaleCategoryId: categoryMap[prod.category],
          pricingTiers: [
            { minQty: prod.moq, price: prod.price },
            { minQty: prod.moq * 3, price: Math.round(prod.price * 0.95) },
            { minQty: prod.moq * 10, price: Math.round(prod.price * 0.9) },
          ],
          moq: prod.moq,
          stockQuantity: prod.stock,
          unit: prod.unit,
          isActive: true,
          images: [],
        }
      });
      productIds.push(product.id);
    }
    process.stdout.write('.');
  }
  console.log(`\n   ✅ ${PRODUCTS.length} products ready`);

  // =====================
  // 4. CREATE MERCHANTS
  // =====================
  console.log('\n🏪 Creating Merchant Tenants with GPS Coordinates...');
  const merchantTenants = [];

  for (const m of MERCHANT_DATA) {
    // Check if phone already exists
    const existingStore = await prisma.store.findFirst({ where: { waNumber: m.phone } });
    if (existingStore) {
      const tenant = await prisma.tenant.findUnique({ where: { id: existingStore.tenantId } });
      merchantTenants.push({ tenantId: tenant.id, data: m });
      process.stdout.write('.');
      continue;
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    const tenant = await prisma.tenant.create({
      data: {
        name: m.name,
        plan: getRandom(['FREE', 'PREMIUM', 'FREE', 'FREE']),
        subscriptionStatus: getRandom(['ACTIVE', 'TRIAL', 'ACTIVE', 'EXPIRED']),
      }
    });

    const store = await prisma.store.create({
      data: {
        tenantId: tenant.id,
        name: m.name,
        location: m.location,
        latitude: m.lat + (Math.random() - 0.5) * 0.005, // Small jitter
        longitude: m.lng + (Math.random() - 0.5) * 0.005,
        category: m.category,
        waNumber: m.phone,
        balance: getRandomInt(100000, 5000000),
      }
    });

    await prisma.user.create({
      data: {
        email: `${m.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@merchant.com`,
        name: m.owner,
        passwordHash: hashedPassword,
        role: 'OWNER',
        tenantId: tenant.id,
        storeId: store.id,
      }
    });

    merchantTenants.push({ tenantId: tenant.id, data: m });
    process.stdout.write('.');
  }
  console.log(`\n   ✅ ${merchantTenants.length} merchants created with GPS coordinates`);

  // =====================
  // 5. CREATE WHOLESALE ORDERS (for ~60% of merchants = "active")
  // =====================
  console.log('\n📋 Creating Wholesale Orders...');
  const activeCount = Math.ceil(merchantTenants.length * 0.6); // 60% are active buyers
  const activeMerchants = merchantTenants.slice(0, activeCount);
  const ORDER_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  let orderCounter = Date.now(); // Use timestamp to ensure unique order numbers

  for (const merchant of activeMerchants) {
    const orderCount = getRandomInt(1, 5); // 1-5 orders per active merchant

    for (let i = 0; i < orderCount; i++) {
      const itemCount = getRandomInt(2, 5);
      const selectedProducts = [];
      const usedIndexes = new Set();

      for (let j = 0; j < itemCount; j++) {
        let idx;
        do { idx = getRandomInt(0, productIds.length - 1); } while (usedIndexes.has(idx));
        usedIndexes.add(idx);
        const qty = getRandomInt(PRODUCTS[idx].moq, PRODUCTS[idx].moq * 5);
        selectedProducts.push({
          productId: productIds[idx],
          quantity: qty,
          unitPrice: PRODUCTS[idx].price,
          subtotal: qty * PRODUCTS[idx].price,
        });
      }

      const totalAmount = selectedProducts.reduce((sum, p) => sum + p.subtotal, 0);
      const status = getRandom(ORDER_STATUSES);
      const paymentStatus = ['DELIVERED', 'SHIPPED', 'PROCESSING'].includes(status) ? 'PAID' : getRandom(['PAID', 'UNPAID', 'PAID']);

      orderCounter++;
      const order = await prisma.wholesaleOrder.create({
        data: {
          distributorId: distributor.id,
          tenantId: merchant.tenantId,
          orderNumber: `WO-${orderCounter}-${getRandomInt(100,999)}`,
          totalAmount,
          status,
          paymentStatus,
          paymentMethod: getRandom(['TRANSFER', 'COD', 'CREDIT']),
          shippingAddress: { address: `${merchant.data.name}, ${merchant.data.location}, Medan`, city: 'Medan' },
          createdAt: getRandomDate(60),
          items: {
            create: selectedProducts.map(p => ({
              wholesaleProductId: p.productId,
              quantity: p.quantity,
              unitPrice: p.unitPrice,
              subtotal: p.subtotal,
            }))
          }
        }
      });
      process.stdout.write('.');
    }
  }
  console.log(`\n   ✅ Orders created for ${activeCount} active merchants`);

  // =====================
  // 6. CREATE DISTRIBUTOR-CUSTOMER RELATIONS (credit limits)
  // =====================
  console.log('\n💳 Setting up Credit Limits for Active Merchants...');

  for (const merchant of activeMerchants) {
    const existing = await prisma.distributorCustomer.findFirst({
      where: { distributorId: distributor.id, tenantId: merchant.tenantId }
    });

    if (!existing) {
      const creditLimit = getRandom([0, 1000000, 2000000, 5000000, 10000000, 15000000]);
      await prisma.distributorCustomer.create({
        data: {
          distributorId: distributor.id,
          tenantId: merchant.tenantId,
          creditLimit,
          creditUsed: creditLimit > 0 ? getRandomInt(0, Math.floor(creditLimit * 0.7)) : 0,
          paymentTerm: getRandom([0, 7, 14, 30]),
        }
      });
    }
    process.stdout.write('.');
  }
  console.log(`\n   ✅ Credit limits configured`);

  // =====================
  // 7. CREATE DISCOUNTS
  // =====================
  console.log('\n🎁 Creating Sample Discounts...');

  const discountExists = await prisma.wholesaleDiscount.findFirst({ where: { distributorId: distributor.id } });
  if (!discountExists) {
    await prisma.wholesaleDiscount.create({
      data: {
        distributorId: distributor.id,
        name: 'Promo Ramadhan 2025',
        code: 'RAMADHAN25',
        type: 'PERCENTAGE',
        value: 10,
        minOrderAmount: 500000,
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-04-30'),
        isActive: true,
      }
    });

    await prisma.wholesaleDiscount.create({
      data: {
        distributorId: distributor.id,
        name: 'Diskon Pelanggan Baru',
        code: 'NEWCUST50K',
        type: 'FIXED',
        value: 50000,
        minOrderAmount: 300000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        isActive: true,
      }
    });

    await prisma.wholesaleDiscount.create({
      data: {
        distributorId: distributor.id,
        name: 'Flash Sale Weekend',
        code: 'WEEKEND15',
        type: 'PERCENTAGE',
        value: 15,
        minOrderAmount: 1000000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
      }
    });
    console.log('   ✅ 3 discounts created');
  } else {
    console.log('   ⚠️  Discounts already exist, skipping');
  }

  // =====================
  // SUMMARY
  // =====================
  console.log('\n' + '='.repeat(50));
  console.log('🎉 SEEDING COMPLETE!');
  console.log('='.repeat(50));
  console.log(`
📌 Login Credentials:
   Distributor: ${DISTRIBUTOR_EMAIL} / ${DISTRIBUTOR_PASSWORD}

📊 Data Created:
   • ${CATEGORIES.length} Wholesale Categories
   • ${PRODUCTS.length} Wholesale Products
   • ${merchantTenants.length} Merchants (with GPS coordinates)
   • ${activeCount} Active Buyers (with orders)
   • ${merchantTenants.length - activeCount} Potential Leads (no orders yet)
   • Credit limits configured for active merchants
   • 3 Discount promotions

🗺️  Acquisition Map:
   All merchants have latitude/longitude around Medan area.
   Open the Distributor Portal → Peta Akuisisi to see them on the map.
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
