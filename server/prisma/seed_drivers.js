const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const driverNames = [
    'Ahmad Ridwan', 'Budi Santoso', 'Cahyo Pratama', 'Dedi Kurniawan', 'Eko Saputra',
    'Fajar Nugroho', 'Gunawan Wijaya', 'Hendra Setiawan', 'Irfan Maulana', 'Joko Susilo',
    'Krisna Aditya', 'Lukman Hakim', 'Mulyadi Rahman', 'Nanda Firmansyah', 'Oscar Putra'
];

const vehicleTypes = ['MOTORCYCLE', 'MOTORCYCLE', 'MOTORCYCLE', 'CAR', 'CAR'];
const vehicleBrands = ['Honda Vario', 'Yamaha NMAX', 'Honda Beat', 'Toyota Avanza', 'Daihatsu Xenia'];
const statuses = ['ONLINE', 'ONLINE', 'ONLINE', 'OFFLINE', 'OFFLINE', 'BUSY', 'BUSY'];

const medanCenter = { lat: 3.5952, lng: 98.6722 };

function randomOffset(base, range) {
    return base + (Math.random() - 0.5) * range;
}

function randomPhone() {
    return '08' + Math.floor(1000000000 + Math.random() * 9000000000).toString().slice(0, 10);
}

function randomPlate() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const l1 = letters[Math.floor(Math.random() * 26)];
    const l2 = letters[Math.floor(Math.random() * 26)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `BK ${num} ${l1}${l2}`;
}

async function main() {
    console.log('🚗 Seeding Drivers...');

    for (let i = 0; i < driverNames.length; i++) {
        const name = driverNames[i];
        const phone = randomPhone();
        const email = name.toLowerCase().replace(/\s/g, '.') + '@driver.rana.id';
        const vIdx = i % vehicleTypes.length;
        const status = statuses[i % statuses.length];

        const existing = await prisma.driver.findFirst({ where: { phone } });
        if (existing) {
            console.log(`  ⏭ ${name} (phone exists), skipping`);
            continue;
        }

        await prisma.driver.create({
            data: {
                name,
                phone,
                email,
                nik: '12' + Math.floor(10000000000000 + Math.random() * 90000000000000).toString().slice(0, 14),
                address: `Jl. ${name.split(' ')[1]} No. ${Math.floor(1 + Math.random() * 100)}, Medan`,
                vehicleType: vehicleTypes[vIdx],
                vehiclePlate: randomPlate(),
                vehicleBrand: vehicleBrands[vIdx],
                vehicleYear: String(2018 + Math.floor(Math.random() * 6)),
                status,
                latitude: status !== 'OFFLINE' ? randomOffset(medanCenter.lat, 0.08) : null,
                longitude: status !== 'OFFLINE' ? randomOffset(medanCenter.lng, 0.08) : null,
                balance: Math.floor(Math.random() * 500000),
                rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
                ratingCount: Math.floor(10 + Math.random() * 200),
                isActive: true,
            }
        });
        console.log(`  ✅ ${name} (${vehicleTypes[vIdx]}, ${status})`);
    }

    // Seed some service requests
    console.log('\n📦 Seeding Service Requests...');

    const drivers = await prisma.driver.findMany({ take: 10 });
    const serviceTypes = ['RIDE', 'SEND', 'FOOD'];
    const serviceStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED', 'SEARCHING'];

    for (let i = 0; i < 30; i++) {
        const driver = drivers[i % drivers.length];
        const type = serviceTypes[i % serviceTypes.length];
        const status = serviceStatuses[i % serviceStatuses.length];

        await prisma.serviceRequest.create({
            data: {
                type,
                customerId: 'customer-' + Math.floor(Math.random() * 100),
                driverId: status !== 'SEARCHING' ? driver.id : null,
                status,
                originLat: randomOffset(medanCenter.lat, 0.05),
                originLng: randomOffset(medanCenter.lng, 0.05),
                originAddress: `Jl. Gatot Subroto No. ${Math.floor(1 + Math.random() * 200)}, Medan`,
                destLat: randomOffset(medanCenter.lat, 0.06),
                destLng: randomOffset(medanCenter.lng, 0.06),
                destAddress: `Jl. Sudirman No. ${Math.floor(1 + Math.random() * 150)}, Medan`,
                price: Math.floor(10000 + Math.random() * 50000),
                paymentMethod: Math.random() > 0.5 ? 'CASH' : 'WALLET',
                paymentStatus: status === 'COMPLETED' ? 'PAID' : 'UNPAID',
                notes: type === 'FOOD' ? 'Pesanan makanan' : null,
            }
        });
    }

    console.log('  ✅ 30 service requests created');
    console.log('\n🎉 Driver seed complete!');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
