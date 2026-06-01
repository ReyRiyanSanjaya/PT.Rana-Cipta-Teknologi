const prisma = require('../config/database');
const { getIo } = require('../socket');
const { successResponse, errorResponse } = require('../utils/response');

// Create a new Service Request (Ride/Send/Food) - called by buyer app
exports.createRequest = async (req, res) => {
  try {
    const { type, customerId, originLat, originLng, originAddress, destLat, destLng, destAddress, price, paymentMethod, notes } = req.body;

    // Use authenticated user if customerId not provided
    const customer = customerId || (req.user ? req.user.userId : 'anonymous');

    const newRequest = await prisma.serviceRequest.create({
      data: {
        type: type || 'RIDE',
        customerId: customer,
        originLat: parseFloat(originLat),
        originLng: parseFloat(originLng),
        originAddress: originAddress || '',
        destLat: parseFloat(destLat),
        destLng: parseFloat(destLng),
        destAddress: destAddress || '',
        price: parseFloat(price) || 0,
        paymentMethod: paymentMethod || 'CASH',
        notes,
      }
    });

    // Emit socket event to all online drivers in the driver_zone
    try {
      const io = getIo();
      io.to('driver_zone').emit('new_order_driver', {
        id: newRequest.id,
        type: newRequest.type,
        customerId: newRequest.customerId,
        origin: newRequest.originAddress,
        originAddress: newRequest.originAddress,
        originLat: newRequest.originLat,
        originLng: newRequest.originLng,
        destination: newRequest.destAddress,
        destAddress: newRequest.destAddress,
        destLat: newRequest.destLat,
        destLng: newRequest.destLng,
        price: newRequest.price,
        paymentMethod: newRequest.paymentMethod,
        status: newRequest.status,
        createdAt: newRequest.createdAt,
        // Simulated fields for driver UI
        customer: 'Pelanggan',
        rating: 4.8,
        distance: '~',
        timeLeft: 30,
      });
    } catch (e) {
      console.warn('[Socket] Failed to emit new_order_driver:', e.message);
    }

    // Also send FCM push to drivers topic
    try {
      const { sendToTopic } = require('../utils/pushNotification');
      await sendToTopic('drivers', {
        title: `Pesanan ${type || 'RIDE'} Baru!`,
        body: `${originAddress} → ${destAddress}`,
      }, {
        type: 'new_order',
        id: newRequest.id,
      });
    } catch (_) {}

    return successResponse(res, newRequest, 'Service request created');
  } catch (error) {
    console.error('Create Request Error:', error);
    return errorResponse(res, 'Failed to create service request', 500, error);
  }
};

// Get request status (for buyer to poll/check)
exports.getRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            rating: true,
            vehicleType: true,
            vehiclePlate: true,
            vehicleBrand: true,
            latitude: true,
            longitude: true,
          }
        }
      }
    });

    if (!request) return errorResponse(res, 'Request not found', 404);

    return successResponse(res, request);
  } catch (error) {
    console.error('Get Request Status Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Cancel a request (by buyer)
exports.cancelRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) return errorResponse(res, 'Request not found', 404);

    // Can only cancel if still SEARCHING or ACCEPTED
    if (!['SEARCHING', 'ACCEPTED'].includes(request.status)) {
      return errorResponse(res, 'Cannot cancel at this stage', 400);
    }

    const updated = await prisma.serviceRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' }
    });

    // Free the driver if one was assigned
    if (request.driverId) {
      await prisma.driver.update({
        where: { id: request.driverId },
        data: { status: 'ONLINE' }
      });

      // Notify driver via socket
      try {
        const io = getIo();
        io.to(`order:${requestId}`).emit('order_status', {
          requestId,
          status: 'CANCELLED',
          message: 'Pesanan dibatalkan oleh pelanggan',
        });
      } catch (_) {}
    }

    return successResponse(res, updated, 'Request cancelled');
  } catch (error) {
    console.error('Cancel Request Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Driver accept a request (legacy endpoint - prefer /api/driver/accept/:id)
exports.acceptRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { driverId } = req.body;

    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) return errorResponse(res, 'Request not found', 404);
    if (request.status !== 'SEARCHING') return errorResponse(res, 'Already taken', 400);

    const updated = await prisma.serviceRequest.update({
      where: { id: requestId },
      data: { driverId, status: 'ACCEPTED' }
    });

    await prisma.driver.update({
      where: { id: driverId },
      data: { status: 'BUSY' }
    });

    // Get driver info for buyer notification
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, name: true, phone: true, rating: true, vehicleType: true, vehiclePlate: true, vehicleBrand: true, latitude: true, longitude: true }
    });

    // Notify buyer via socket
    try {
      const io = getIo();
      io.to(`order:${requestId}`).emit('order_status', {
        requestId,
        status: 'ACCEPTED',
        driver,
      });
    } catch (_) {}

    return successResponse(res, updated, 'Request accepted');
  } catch (error) {
    console.error('Accept Request Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Update status (ARRIVED, IN_TRANSIT, COMPLETED)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, driverId } = req.body;

    const request = await prisma.serviceRequest.update({
      where: { id: requestId },
      data: { status }
    });

    // If completed or cancelled, free the driver
    if ((status === 'COMPLETED' || status === 'CANCELLED') && driverId) {
      await prisma.driver.update({
        where: { id: driverId },
        data: { status: 'ONLINE' }
      });
    }

    // Notify buyer via socket
    try {
      const io = getIo();
      io.to(`order:${requestId}`).emit('order_status', {
        requestId,
        status,
        driverId,
      });
    } catch (_) {}

    return successResponse(res, request, 'Status updated');
  } catch (error) {
    console.error('Update Request Status Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};

// Get requests by status (for Driver app to find jobs)
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await prisma.serviceRequest.findMany({
      where: { status: 'SEARCHING' },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return successResponse(res, requests);
  } catch (error) {
    console.error('Get Pending Requests Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};


// Calculate ride price based on distance
exports.calculatePrice = async (req, res) => {
  try {
    const { type, originLat, originLng, destLat, destLng } = req.body;

    // Haversine distance calculation
    const R = 6371; // Earth radius in km
    const dLat = (destLat - originLat) * Math.PI / 180;
    const dLng = (destLng - originLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Get pricing settings from DB (or use defaults)
    let baseFare = 5000;
    let perKmRate = 2500;
    let surgeMultiplier = 1.0;

    try {
      const settings = await prisma.systemSettings.findMany({
        where: { key: { in: ['DRIVER_BASE_FARE', 'DRIVER_PER_KM_RATE', 'DRIVER_SURGE_MULTIPLIER'] } }
      });
      const map = {};
      settings.forEach(s => { map[s.key] = parseFloat(s.value) || 0; });
      if (map.DRIVER_BASE_FARE) baseFare = map.DRIVER_BASE_FARE;
      if (map.DRIVER_PER_KM_RATE) perKmRate = map.DRIVER_PER_KM_RATE;
      if (map.DRIVER_SURGE_MULTIPLIER) surgeMultiplier = map.DRIVER_SURGE_MULTIPLIER;
    } catch (_) {}

    // Type multiplier
    let typeMultiplier = 1.0;
    if (type === 'CAR' || type === 'RIDE' && req.body.vehicleType === 'CAR') {
      typeMultiplier = 2.5;
    } else if (type === 'SEND') {
      typeMultiplier = 0.8;
    }

    const rawPrice = (baseFare + (perKmRate * distanceKm)) * typeMultiplier * surgeMultiplier;
    const price = Math.round(rawPrice / 500) * 500; // Round to nearest 500
    const minPrice = type === 'CAR' ? 15000 : (type === 'SEND' ? 8000 : 8000);
    const finalPrice = Math.max(price, minPrice);

    return successResponse(res, {
      distance: Math.round(distanceKm * 10) / 10, // 1 decimal
      baseFare,
      perKmRate,
      surgeMultiplier,
      typeMultiplier,
      price: finalPrice,
      estimatedMinutes: Math.round(distanceKm * 3), // ~3 min per km in city
    });
  } catch (error) {
    console.error('Calculate Price Error:', error);
    return errorResponse(res, 'Failed to calculate price', 500, error);
  }
};

// Get buyer's ride history
exports.getMyRides = async (req, res) => {
  try {
    const { userId } = req.user;

    const rides = await prisma.serviceRequest.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        driver: {
          select: { id: true, name: true, rating: true, vehicleType: true, vehiclePlate: true }
        }
      }
    });

    return successResponse(res, rides);
  } catch (error) {
    console.error('Get My Rides Error:', error);
    return errorResponse(res, 'Failed to fetch ride history', 500, error);
  }
};


// Give tip to driver after trip completion
exports.giveTip = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) return errorResponse(res, 'Invalid tip amount', 400);

    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) return errorResponse(res, 'Request not found', 404);
    if (request.status !== 'COMPLETED') return errorResponse(res, 'Can only tip completed trips', 400);
    if (!request.driverId) return errorResponse(res, 'No driver assigned', 400);

    const tipAmount = parseFloat(amount);

    // Add tip to driver balance and create transaction
    await prisma.$transaction(async (tx) => {
      await tx.driver.update({
        where: { id: request.driverId },
        data: { balance: { increment: tipAmount } }
      });

      await tx.driverTransaction.create({
        data: {
          driverId: request.driverId,
          type: 'TIP',
          amount: tipAmount,
          description: `Tip dari pelanggan`,
          referenceId: request.id,
        }
      });
    });

    // Notify driver via socket
    try {
      const io = getIo();
      io.to(`order:${requestId}`).emit('order_status', {
        requestId,
        status: 'TIP_RECEIVED',
        tipAmount,
        message: `Anda menerima tip Rp${tipAmount.toLocaleString('id-ID')}`,
      });
    } catch (_) {}

    return successResponse(res, { tipAmount }, 'Tip sent successfully');
  } catch (error) {
    console.error('Give Tip Error:', error);
    return errorResponse(res, 'Failed to send tip', 500, error);
  }
};

// Get ETA for an active trip (based on driver's current location to destination)
exports.getETA = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { driver: { select: { latitude: true, longitude: true } } }
    });

    if (!request) return errorResponse(res, 'Request not found', 404);

    let eta = null;
    let distance = null;

    if (request.driver && request.driver.latitude && request.driver.longitude) {
      // Calculate distance from driver to relevant point
      const targetLat = ['ACCEPTED', 'ARRIVED'].includes(request.status) ? request.originLat : request.destLat;
      const targetLng = ['ACCEPTED', 'ARRIVED'].includes(request.status) ? request.originLng : request.destLng;

      const R = 6371;
      const dLat = (targetLat - request.driver.latitude) * Math.PI / 180;
      const dLng = (targetLng - request.driver.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(request.driver.latitude * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance = Math.round(R * c * 10) / 10; // km with 1 decimal
      eta = Math.max(1, Math.round(distance * 3)); // ~3 min per km, minimum 1 min
    }

    return successResponse(res, { eta, distance, status: request.status });
  } catch (error) {
    console.error('Get ETA Error:', error);
    return errorResponse(res, 'Server error', 500, error);
  }
};
