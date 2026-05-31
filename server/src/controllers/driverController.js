const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { getIo } = require('../socket');

// Register Driver (standalone, without auth - used from admin or direct)
exports.registerDriver = async (req, res) => {
  try {
    const { userId, name, phone, email, vehicleType, vehiclePlate, vehicleBrand } = req.body;

    const newDriver = await prisma.driver.create({
      data: {
        userId,
        name,
        phone,
        email,
        vehicleType,
        vehiclePlate,
        vehicleBrand,
      }
    });

    return successResponse(res, newDriver, 'Driver registered');
  } catch (error) {
    console.error('Register Driver Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Driver Profile (authenticated)
exports.getDriverProfile = async (req, res) => {
  try {
    const { userId } = req.user;

    const driver = await prisma.driver.findFirst({
      where: { userId },
      include: {
        serviceRequests: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!driver) {
      return errorResponse(res, 'Driver profile not found', 404);
    }

    return successResponse(res, driver);
  } catch (error) {
    console.error('Get Driver Profile Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Driver by ID (admin or public)
exports.getDriverById = async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { serviceRequests: true }
    });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    return successResponse(res, driver);
  } catch (error) {
    console.error('Get Driver Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Update Driver Status (Online/Offline/Busy) + Location
exports.updateStatus = async (req, res) => {
  try {
    const { userId } = req.user;
    const { status, latitude, longitude } = req.body;

    const driver = await prisma.driver.findFirst({ where: { userId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const updated = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        status,
        ...(latitude != null && { latitude: parseFloat(latitude) }),
        ...(longitude != null && { longitude: parseFloat(longitude) }),
      }
    });

    return successResponse(res, updated);
  } catch (error) {
    console.error('Update Driver Status Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Update Driver Location (lightweight, called frequently)
exports.updateLocation = async (req, res) => {
  try {
    const { userId } = req.user;
    const { latitude, longitude } = req.body;

    const driver = await prisma.driver.findFirst({ where: { userId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      }
    });

    return successResponse(res, null, 'Location updated');
  } catch (error) {
    console.error('Update Location Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Wallet / Balance Info
exports.getWallet = async (req, res) => {
  try {
    const { userId } = req.user;

    const driver = await prisma.driver.findFirst({
      where: { userId },
      select: { id: true, balance: true, name: true }
    });

    if (!driver) return errorResponse(res, 'Driver not found', 404);

    // Get recent transactions (service requests that are completed)
    const recentTrips = await prisma.serviceRequest.findMany({
      where: { driverId: driver.id, status: 'COMPLETED' },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        price: true,
        originAddress: true,
        destAddress: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return successResponse(res, {
      balance: driver.balance,
      transactions: recentTrips,
    });
  } catch (error) {
    console.error('Get Wallet Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Earnings Summary
exports.getEarnings = async (req, res) => {
  try {
    const { userId } = req.user;
    const { period } = req.query; // 'today', 'week', 'month'

    const driver = await prisma.driver.findFirst({ where: { userId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'week':
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    const completedTrips = await prisma.serviceRequest.findMany({
      where: {
        driverId: driver.id,
        status: 'COMPLETED',
        updatedAt: { gte: startDate }
      },
      select: {
        id: true,
        type: true,
        price: true,
        updatedAt: true,
      }
    });

    const totalEarnings = completedTrips.reduce((sum, t) => sum + t.price, 0);
    const totalTrips = completedTrips.length;

    // Group by day for chart
    const dailyEarnings = {};
    for (const trip of completedTrips) {
      const day = trip.updatedAt.toISOString().split('T')[0];
      dailyEarnings[day] = (dailyEarnings[day] || 0) + trip.price;
    }

    return successResponse(res, {
      totalEarnings,
      totalTrips,
      dailyEarnings,
      period: period || 'week',
    });
  } catch (error) {
    console.error('Get Earnings Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Trip History
exports.getTripHistory = async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    const driver = await prisma.driver.findFirst({ where: { userId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [trips, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where: { driverId: driver.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.serviceRequest.count({ where: { driverId: driver.id } })
    ]);

    return successResponse(res, {
      trips,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Trip History Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Accept a Service Request
exports.acceptRequest = async (req, res) => {
  try {
    const { userId } = req.user;
    const { requestId } = req.params;

    const driver = await prisma.driver.findFirst({ where: { userId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) return errorResponse(res, 'Request not found', 404);
    if (request.status !== 'SEARCHING') return errorResponse(res, 'Request already taken', 400);

    const updated = await prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        driverId: driver.id,
        status: 'ACCEPTED'
      }
    });

    // Update driver status to BUSY
    await prisma.driver.update({
      where: { id: driver.id },
      data: { status: 'BUSY' }
    });

    // Notify customer via socket
    try {
      const io = getIo();
      io.to(`order:${requestId}`).emit('order_status', {
        requestId,
        status: 'ACCEPTED',
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          rating: driver.rating,
          vehicleType: driver.vehicleType,
          vehiclePlate: driver.vehiclePlate,
          vehicleBrand: driver.vehicleBrand,
          latitude: driver.latitude,
          longitude: driver.longitude,
        },
      });
    } catch (_) {}

    return successResponse(res, updated, 'Request accepted');
  } catch (error) {
    console.error('Accept Request Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Update Trip Status (step progression)
exports.updateTripStatus = async (req, res) => {
  try {
    const { userId } = req.user;
    const { requestId } = req.params;
    const { status } = req.body; // ARRIVED, IN_TRANSIT, COMPLETED, CANCELLED

    const driver = await prisma.driver.findFirst({ where: { userId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) return errorResponse(res, 'Request not found', 404);
    if (request.driverId !== driver.id) return errorResponse(res, 'Not your request', 403);

    const updated = await prisma.serviceRequest.update({
      where: { id: requestId },
      data: { status }
    });

    // If completed, add earnings to driver balance and set status back to ONLINE
    if (status === 'COMPLETED') {
      await prisma.$transaction(async (tx) => {
        await tx.driver.update({
          where: { id: driver.id },
          data: {
            balance: { increment: request.price },
            status: 'ONLINE',
            ratingCount: { increment: 1 },
          }
        });

        // Create transaction record
        await tx.driverTransaction.create({
          data: {
            driverId: driver.id,
            type: 'TRIP_EARNING',
            amount: request.price,
            description: `${request.type} - ${request.destAddress || 'Trip'}`,
            referenceId: request.id,
          }
        });
      });
    }

    // If cancelled, set driver back to ONLINE
    if (status === 'CANCELLED') {
      await prisma.driver.update({
        where: { id: driver.id },
        data: { status: 'ONLINE' }
      });
    }

    // Notify customer via socket
    try {
      const io = getIo();
      io.to(`order:${requestId}`).emit('order_status', {
        requestId,
        status,
        driverId: driver.id,
      });
    } catch (_) {}

    return successResponse(res, updated, 'Trip status updated');
  } catch (error) {
    console.error('Update Trip Status Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Active Trip (current ongoing trip)
exports.getActiveTrip = async (req, res) => {
  try {
    const { userId } = req.user;

    const driver = await prisma.driver.findFirst({ where: { userId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const activeTrip = await prisma.serviceRequest.findFirst({
      where: {
        driverId: driver.id,
        status: { in: ['ACCEPTED', 'ARRIVED', 'IN_TRANSIT'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(res, activeTrip);
  } catch (error) {
    console.error('Get Active Trip Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Available Requests (nearby orders looking for drivers)
exports.getAvailableRequests = async (req, res) => {
  try {
    const { userId } = req.user;
    const { latitude, longitude } = req.query;

    const driver = await prisma.driver.findFirst({ where: { userId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    // Get all SEARCHING requests (in production, filter by proximity)
    const requests = await prisma.serviceRequest.findMany({
      where: { status: 'SEARCHING' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return successResponse(res, requests);
  } catch (error) {
    console.error('Get Available Requests Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Driver Stats (for dashboard)
exports.getStats = async (req, res) => {
  try {
    const { userId } = req.user;

    const driver = await prisma.driver.findFirst({ where: { userId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayTrips, totalTrips, todayEarnings, totalAssigned, totalCancelled] = await Promise.all([
      prisma.serviceRequest.count({
        where: { driverId: driver.id, status: 'COMPLETED', updatedAt: { gte: today } }
      }),
      prisma.serviceRequest.count({
        where: { driverId: driver.id, status: 'COMPLETED' }
      }),
      prisma.serviceRequest.aggregate({
        where: { driverId: driver.id, status: 'COMPLETED', updatedAt: { gte: today } },
        _sum: { price: true }
      }),
      // Total requests ever assigned to this driver (for acceptance rate)
      prisma.serviceRequest.count({
        where: { driverId: driver.id }
      }),
      // Total cancelled by this driver
      prisma.serviceRequest.count({
        where: { driverId: driver.id, status: 'CANCELLED' }
      }),
    ]);

    // Calculate rates
    const completionRate = totalAssigned > 0 ? (totalTrips / totalAssigned) : 1.0;
    const acceptanceRate = totalAssigned > 0 ? ((totalAssigned - totalCancelled) / totalAssigned) : 1.0;

    return successResponse(res, {
      balance: driver.balance,
      rating: driver.rating,
      ratingCount: driver.ratingCount,
      todayTrips,
      totalTrips,
      todayEarnings: todayEarnings._sum.price || 0,
      status: driver.status,
      isActive: driver.isActive,
      acceptanceRate: Math.round(acceptanceRate * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Update Driver Profile
exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const { name, phone, vehicleBrand, vehiclePlate, vehicleYear } = req.body;

    const driver = await prisma.driver.findFirst({ where: { userId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const updated = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(vehicleBrand && { vehicleBrand }),
        ...(vehiclePlate && { vehiclePlate }),
        ...(vehicleYear && { vehicleYear }),
      }
    });

    return successResponse(res, updated, 'Profile updated');
  } catch (error) {
    console.error('Update Profile Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ==================== WALLET TRANSACTIONS ====================

// Get Wallet with Transaction History
exports.getWalletTransactions = async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    const driver = await prisma.driver.findFirst({ where: { userId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      prisma.driverTransaction.findMany({
        where: { driverId: driver.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.driverTransaction.count({ where: { driverId: driver.id } })
    ]);

    return successResponse(res, {
      balance: driver.balance,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Wallet Transactions Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Request Withdrawal
exports.requestWithdrawal = async (req, res) => {
  try {
    const { userId } = req.user;
    const { amount, bankName, accountNumber, accountHolder } = req.body;

    if (!amount || !bankName || !accountNumber) {
      return errorResponse(res, 'Amount, bank name, and account number are required', 400);
    }

    const driver = await prisma.driver.findFirst({ where: { userId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount < 10000) {
      return errorResponse(res, 'Minimum withdrawal is Rp10.000', 400);
    }

    if (withdrawAmount > driver.balance) {
      return errorResponse(res, 'Insufficient balance', 400);
    }

    // Calculate fee (2.5% or minimum Rp2500)
    const fee = Math.max(Math.round(withdrawAmount * 0.025), 2500);
    const netAmount = withdrawAmount - fee;

    // Create withdrawal and deduct balance in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct balance
      await tx.driver.update({
        where: { id: driver.id },
        data: { balance: { decrement: withdrawAmount } }
      });

      // Create withdrawal record
      const withdrawal = await tx.driverWithdrawal.create({
        data: {
          driverId: driver.id,
          amount: withdrawAmount,
          fee,
          netAmount,
          bankName,
          accountNumber,
          accountHolder: accountHolder || driver.name,
        }
      });

      // Create transaction log
      await tx.driverTransaction.create({
        data: {
          driverId: driver.id,
          type: 'WITHDRAWAL',
          amount: -withdrawAmount,
          description: `Penarikan ke ${bankName} ${accountNumber}`,
          referenceId: withdrawal.id,
        }
      });

      return withdrawal;
    });

    return successResponse(res, result, 'Withdrawal request submitted');
  } catch (error) {
    console.error('Request Withdrawal Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Withdrawal History
exports.getWithdrawals = async (req, res) => {
  try {
    const { userId } = req.user;

    const driver = await prisma.driver.findFirst({ where: { userId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const withdrawals = await prisma.driverWithdrawal.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return successResponse(res, withdrawals);
  } catch (error) {
    console.error('Get Withdrawals Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Rate a completed trip (from customer side, but driver receives it)
exports.rateDriver = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return errorResponse(res, 'Rating must be between 1 and 5', 400);
    }

    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) return errorResponse(res, 'Request not found', 404);
    if (request.status !== 'COMPLETED') return errorResponse(res, 'Can only rate completed trips', 400);
    if (!request.driverId) return errorResponse(res, 'No driver assigned', 400);

    const driver = await prisma.driver.findUnique({ where: { id: request.driverId } });
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    // Calculate new average rating
    const newRatingCount = driver.ratingCount + 1;
    const newRating = ((driver.rating * driver.ratingCount) + parseFloat(rating)) / newRatingCount;

    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        rating: Math.round(newRating * 100) / 100, // 2 decimal places
        ratingCount: newRatingCount,
      }
    });

    return successResponse(res, { newRating: Math.round(newRating * 100) / 100 }, 'Rating submitted');
  } catch (error) {
    console.error('Rate Driver Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ==================== LEADERBOARD & COMMUNITY ====================

// Get Leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const { type = 'trips', period = 'week' } = req.query;

    const now = new Date();
    let startDate;
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'week':
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    let leaderboard = [];

    if (type === 'earnings') {
      const raw = await prisma.serviceRequest.groupBy({
        by: ['driverId'],
        where: { status: 'COMPLETED', driverId: { not: null }, updatedAt: { gte: startDate } },
        _sum: { price: true },
        orderBy: { _sum: { price: 'desc' } },
        take: 20,
      });

      const driverIds = raw.map(r => r.driverId).filter(Boolean);
      const drivers = await prisma.driver.findMany({
        where: { id: { in: driverIds } },
        select: { id: true, name: true, rating: true, vehicleType: true }
      });
      const dMap = new Map(drivers.map(d => [d.id, d]));

      leaderboard = raw.map((r, idx) => ({
        rank: idx + 1,
        driverId: r.driverId,
        name: dMap.get(r.driverId)?.name || 'Driver',
        rating: dMap.get(r.driverId)?.rating || 0,
        vehicleType: dMap.get(r.driverId)?.vehicleType || 'MOTORCYCLE',
        score: r._sum.price || 0,
        label: `Rp${Math.round(r._sum.price || 0).toLocaleString('id-ID')}`,
      }));
    } else if (type === 'rating') {
      const drivers = await prisma.driver.findMany({
        where: { isActive: true, ratingCount: { gte: 5 } },
        orderBy: { rating: 'desc' },
        take: 20,
        select: { id: true, name: true, rating: true, ratingCount: true, vehicleType: true }
      });

      leaderboard = drivers.map((d, idx) => ({
        rank: idx + 1,
        driverId: d.id,
        name: d.name,
        rating: d.rating,
        vehicleType: d.vehicleType,
        score: d.rating,
        label: `${d.rating} ★ (${d.ratingCount})`,
      }));
    } else {
      // Default: trips count
      const raw = await prisma.serviceRequest.groupBy({
        by: ['driverId'],
        where: { status: 'COMPLETED', driverId: { not: null }, updatedAt: { gte: startDate } },
        _count: true,
        orderBy: { _count: { driverId: 'desc' } },
        take: 20,
      });

      const driverIds = raw.map(r => r.driverId).filter(Boolean);
      const drivers = await prisma.driver.findMany({
        where: { id: { in: driverIds } },
        select: { id: true, name: true, rating: true, vehicleType: true }
      });
      const dMap = new Map(drivers.map(d => [d.id, d]));

      leaderboard = raw.map((r, idx) => ({
        rank: idx + 1,
        driverId: r.driverId,
        name: dMap.get(r.driverId)?.name || 'Driver',
        rating: dMap.get(r.driverId)?.rating || 0,
        vehicleType: dMap.get(r.driverId)?.vehicleType || 'MOTORCYCLE',
        score: r._count,
        label: `${r._count} Trip`,
      }));
    }

    return successResponse(res, leaderboard);
  } catch (error) {
    console.error('Get Leaderboard Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get Community Posts (Forum)
exports.getCommunityPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Use existing Discussion model if available, otherwise return empty
    let posts = [];
    try {
      posts = await prisma.discussion.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          author: { select: { id: true, name: true } }
        }
      });
    } catch (_) {
      // Discussion model might not exist yet - return empty
      posts = [];
    }

    return successResponse(res, posts);
  } catch (error) {
    console.error('Get Community Posts Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Create Community Post
exports.createCommunityPost = async (req, res) => {
  try {
    const { userId } = req.user;
    const { title, content } = req.body;

    if (!content || !content.trim()) {
      return errorResponse(res, 'Content is required', 400);
    }

    let post;
    try {
      post = await prisma.discussion.create({
        data: {
          title: title || '',
          content: content.trim(),
          authorId: userId,
          isActive: true,
        }
      });
    } catch (_) {
      return errorResponse(res, 'Community feature not available yet', 501);
    }

    return successResponse(res, post, 'Post created');
  } catch (error) {
    console.error('Create Community Post Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ==================== HEAT MAP / DEMAND ZONES ====================

// Get demand hotspots based on recent order origins
exports.getHotspots = async (req, res) => {
  try {
    // Get orders from last 2 hours to determine current demand
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const recentOrders = await prisma.serviceRequest.findMany({
      where: {
        createdAt: { gte: since },
        status: { in: ['SEARCHING', 'ACCEPTED', 'COMPLETED'] }
      },
      select: { originLat: true, originLng: true, type: true, price: true, status: true }
    });

    // Cluster nearby orders into zones (simple grid-based clustering)
    const gridSize = 0.005; // ~500m grid cells
    const clusters = {};

    for (const order of recentOrders) {
      const gridLat = Math.round(order.originLat / gridSize) * gridSize;
      const gridLng = Math.round(order.originLng / gridSize) * gridSize;
      const key = `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;

      if (!clusters[key]) {
        clusters[key] = { lat: gridLat, lng: gridLng, count: 0, searching: 0, totalPrice: 0 };
      }
      clusters[key].count++;
      if (order.status === 'SEARCHING') clusters[key].searching++;
      clusters[key].totalPrice += order.price;
    }

    // Convert to array and calculate surge
    const hotspots = Object.values(clusters).map(zone => {
      // Surge based on unfulfilled demand (SEARCHING orders)
      let surge = 1.0;
      if (zone.searching >= 5) surge = 2.0;
      else if (zone.searching >= 3) surge = 1.8;
      else if (zone.searching >= 2) surge = 1.5;
      else if (zone.count >= 5) surge = 1.3;

      return {
        lat: zone.lat,
        lng: zone.lng,
        orderCount: zone.count,
        searchingCount: zone.searching,
        surge,
        avgPrice: zone.count > 0 ? Math.round(zone.totalPrice / zone.count) : 0,
      };
    });

    // Sort by demand (searching first, then total count)
    hotspots.sort((a, b) => b.searchingCount - a.searchingCount || b.orderCount - a.orderCount);

    return successResponse(res, hotspots.slice(0, 20)); // Top 20 zones
  } catch (error) {
    console.error('Get Hotspots Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ==================== TRIP CHAT ====================

// Create or get chat room for a service request (driver ↔ customer)
exports.getTripChatRoom = async (req, res) => {
  try {
    const { userId } = req.user;
    const { requestId } = req.params;

    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) return errorResponse(res, 'Request not found', 404);

    // Room name based on request ID
    const roomName = `trip_${requestId}`;

    // Check if room already exists
    let room = await prisma.chatRoom.findFirst({
      where: { name: roomName, type: 'private' },
      include: { members: true }
    });

    if (!room) {
      // Create new private chat room for this trip
      const memberIds = [request.customerId, userId].filter(Boolean);

      room = await prisma.chatRoom.create({
        data: {
          name: roomName,
          type: 'private',
          members: {
            create: memberIds.map(id => ({ userId: id }))
          }
        },
        include: { members: true }
      });
    }

    return successResponse(res, { roomId: room.id, requestId });
  } catch (error) {
    console.error('Get Trip Chat Room Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// ==================== PHOTO PROOF ====================

// Upload proof photo for pickup/delivery
exports.uploadProof = async (req, res) => {
  try {
    const { userId } = req.user;
    const { requestId } = req.params;
    const { type } = req.body; // 'pickup' or 'delivery'

    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) return errorResponse(res, 'Request not found', 404);

    if (!req.file) return errorResponse(res, 'No photo uploaded', 400);

    const photoUrl = `/uploads/${req.file.filename}`;

    // Store proof URL in notes field (or a dedicated field if schema supports it)
    const currentNotes = request.notes || '';
    const proofNote = `[${type}_proof:${photoUrl}]`;
    const updatedNotes = currentNotes ? `${currentNotes}\n${proofNote}` : proofNote;

    await prisma.serviceRequest.update({
      where: { id: requestId },
      data: { notes: updatedNotes }
    });

    // Notify buyer via socket
    try {
      const io = getIo();
      io.to(`order:${requestId}`).emit('order_status', {
        requestId,
        status: request.status,
        proofType: type,
        proofUrl: photoUrl,
        message: type === 'pickup' ? 'Driver telah mengambil pesanan' : 'Pesanan telah diantar',
      });
    } catch (_) {}

    return successResponse(res, { photoUrl, type }, 'Proof uploaded');
  } catch (error) {
    console.error('Upload Proof Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};
