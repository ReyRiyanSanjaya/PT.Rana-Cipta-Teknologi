const prisma = require('../config/database'); // [FIX] Singleton Prisma
const fs = require('fs');
const path = require('path');

// Helper: Save Base64 Image for Subscription Proof
const saveSubscriptionProof = (base64String, tenantId) => {
    try {
        if (!base64String) return null;
        // Check if it's already a URL
        if (!base64String.startsWith('data:image')) return base64String;

        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;

        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const ext = mimeType.split('/')[1] || 'jpg';
        const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
        const fileName = `sub_proof_${tenantId}_${Date.now()}.${safeExt}`;

        const uploadDir = path.join(__dirname, '../../uploads/proofs');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        fs.writeFileSync(path.join(uploadDir, fileName), buffer);
        return `/uploads/proofs/${fileName}`;
    } catch (e) {
        console.error("Save Proof Error:", e);
        return null;
    }
};

// Create subscription request with selected package
exports.createRequest = async (req, res) => {
    try {
        let { proofUrl, packageId, selectedBank } = req.body;
        const tenantId = req.user.tenantId;

        // Process Proof Image (Base64 -> File)
        const savedUrl = saveSubscriptionProof(proofUrl, tenantId);
        if (savedUrl) {
            proofUrl = savedUrl;
        }

        if (packageId) {
            const pkg = await prisma.subscriptionPackage.findUnique({ where: { id: packageId } });
            if (!pkg || !pkg.isActive) {
                return res.status(400).json({ success: false, error: 'Invalid package selected' });
            }
        }

        let requireSelectedBank = false;
        try {
            const bankSetting = await prisma.systemSettings.findUnique({
                where: { key: 'SUBSCRIPTION_BANKS' }
            });
            if (bankSetting?.value) {
                const parsed = JSON.parse(bankSetting.value);
                if (Array.isArray(parsed)) {
                    const hasValid = parsed.some(b =>
                        (b.bankName && String(b.bankName).trim() !== '') ||
                        (b.accountNumber && String(b.accountNumber).trim() !== '') ||
                        (b.accountName && String(b.accountName).trim() !== '')
                    );
                    if (hasValid) {
                        requireSelectedBank = true;
                    }
                }
            }
        } catch (e) {}

        if (requireSelectedBank) {
            const bank = selectedBank || {};
            const bankName = (bank.bankName || '').toString().trim();
            const accountNumber = (bank.accountNumber || '').toString().trim();
            const accountName = (bank.accountName || '').toString().trim();
            if (!bankName && !accountNumber && !accountName) {
                return res.status(400).json({
                    success: false,
                    error: 'Destination bank is required'
                });
            }
        }

        // Create Request with package reference
        const request = await prisma.subscriptionRequest.create({
            data: {
                tenantId,
                packageId,
                proofUrl,
                selectedBank: selectedBank || undefined,
                status: 'PENDING'
            },
            include: { package: true }
        });

        res.status(201).json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAllRequests = async (req, res) => {
    try {
        const { tenantId, role } = req.user;
        const whereClause = {};

        // If not ADMIN (or similar role), restrict to own tenant
        if (role !== 'ADMIN') {
            whereClause.tenantId = tenantId;
        }

        const requests = await prisma.subscriptionRequest.findMany({
            where: whereClause,
            include: {
                tenant: true,
                package: true // [NEW] Include package info
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Approve request and set subscription duration based on package
exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Update Request and include package info
        const request = await prisma.subscriptionRequest.update({
            where: { id },
            data: { status: 'APPROVED' },
            include: {
                tenant: true,
                package: true // [NEW] Include package for duration
            }
        });

        // 2. Calculate subscription end date based on package duration
        const durationDays = request.package?.durationDays || 30; // Default 30 days
        const subscriptionEndsAt = new Date();
        subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + durationDays);

        // 3. Update Tenant with subscription expiry
        await prisma.tenant.update({
            where: { id: request.tenantId },
            data: {
                subscriptionStatus: 'ACTIVE',
                plan: 'PREMIUM',
                subscriptionEndsAt // [NEW] Set expiry based on package
            }
        });

        // 4. Create Platform Revenue log for the subscription
        if (request.package) {
            await prisma.platformRevenue.create({
                data: {
                    amount: request.package.price,
                    source: 'SUBSCRIPTION',
                    description: `Subscription: ${request.package.name} - ${request.tenant.name}`,
                    referenceId: request.id
                }
            });
        }

        res.json({
            success: true,
            message: 'Subscription Approved',
            data: {
                packageName: request.package?.name,
                durationDays,
                subscriptionEndsAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// [UPDATED] Get packages from database instead of hardcoded data
exports.getPackages = async (req, res) => {
    try {
        const packages = await prisma.subscriptionPackage.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        });

        // Transform to include benefits array from description
        const transformedPackages = packages.map(pkg => ({
            ...pkg,
            benefits: pkg.description ? pkg.description.split('\n').filter(b => b.trim()) : [],
            interval: pkg.durationDays <= 31 ? 'month' : (pkg.durationDays <= 366 ? 'year' : 'custom')
        }));

        res.json({ success: true, data: transformedPackages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get subscription status including expiry date
exports.getStatus = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                subscriptionStatus: true,
                plan: true,
                trialEndsAt: true,
                subscriptionEndsAt: true
            }
        });

        if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

        // Check for pending requests
        const pendingRequest = await prisma.subscriptionRequest.findFirst({
            where: {
                tenantId,
                status: 'PENDING'
            },
            include: { package: true },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate days remaining
        let daysRemaining = null;
        if (tenant.subscriptionStatus === 'ACTIVE' && tenant.subscriptionEndsAt) {
            daysRemaining = Math.ceil((new Date(tenant.subscriptionEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
        } else if (tenant.subscriptionStatus === 'TRIAL' && tenant.trialEndsAt) {
            daysRemaining = Math.ceil((new Date(tenant.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
        }

        res.json({
            success: true,
            data: {
                ...tenant,
                daysRemaining,
                pendingRequest
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
