const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

// Generate a unique referral code for a tenant
const generateCodeForTenant = async (tenantId) => {
  const base = tenantId.replace(/-/g, '').toUpperCase().slice(0, 6);
  for (let i = 0; i < 5; i++) {
    const suffix = Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, '0');
    const candidate = `${base}${suffix}`;
    const exists = await prisma.referralCode.findUnique({
      where: { code: candidate },
    });
    if (!exists) return candidate;
  }
  return `${base}${Date.now().toString().slice(-4)}`;
};

const getMyReferralInfo = async (req, res) => {
  try {
    const { tenantId } = req.user;
    if (!tenantId) return errorResponse(res, 'Invalid tenant', 400);

    // Get or create referral code for this tenant
    let codeRecord = await prisma.referralCode.findFirst({
      where: { tenantId },
    });

    if (!codeRecord) {
      const code = await generateCodeForTenant(tenantId);
      codeRecord = await prisma.referralCode.create({
        data: {
          tenantId,
          code,
        },
      });
    }

    // Count how many tenants this tenant has referred
    const totalReferrals = await prisma.referral.count({
      where: { referrerId: tenantId },
    });

    // Sum released (PAID) rewards
    const paidAgg = await prisma.referralReward.aggregate({
      _sum: { amount: true },
      where: {
        tenantId,
        status: 'PAID',
      },
    });

    // Sum pending rewards
    const pendingAgg = await prisma.referralReward.aggregate({
      _sum: { amount: true },
      where: {
        tenantId,
        status: 'PENDING',
      },
    });

    return successResponse(res, {
      code: codeRecord.code,
      stats: {
        totalReferrals,
        totalRewardReleased: paidAgg._sum.amount || 0,
        totalRewardPending: pendingAgg._sum.amount || 0,
      },
    });
  } catch (error) {
    return errorResponse(res, 'Failed to load referral info', 500, error);
  }
};

const getMyReferrals = async (req, res) => {
  try {
    const { tenantId } = req.user;
    if (!tenantId) return errorResponse(res, 'Invalid tenant', 400);

    const referrals = await prisma.referral.findMany({
      where: { referrerId: tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        referee: {
          select: { id: true, name: true },
        },
        reward: true,
      },
    });

    const items = referrals.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      status: r.status,
      referee: r.referee
        ? { id: r.referee.id, name: r.referee.name }
        : null,
      reward: r.reward
        ? {
            amount: r.reward.amount,
            status: r.reward.status,
            paidAt: r.reward.paidAt,
          }
        : null,
    }));

    return successResponse(res, { items });
  } catch (error) {
    return errorResponse(res, 'Failed to load referrals', 500, error);
  }
};

module.exports = { getMyReferralInfo, getMyReferrals };
