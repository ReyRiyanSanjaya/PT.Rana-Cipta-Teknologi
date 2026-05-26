const prisma = require('../config/database'); // [FIX] Singleton Prisma

// Create a new Service Request (Ride/Send/Food)
exports.createRequest = async (req, res) => {
  try {
    const { type, customerId, originLat, originLng, originAddress, destLat, destLng, destAddress, price, paymentMethod, notes } = req.body;
    
    const newRequest = await prisma.serviceRequest.create({
      data: {
        type,
        customerId,
        originLat,
        originLng,
        originAddress,
        destLat,
        destLng,
        destAddress,
        price,
        paymentMethod,
        notes
      }
    });
    
    // In a real app, emit a socket event here to notify nearby drivers
    res.status(201).json({ success: true, serviceRequest: newRequest });
  } catch (error) {
    console.error('Create Request Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Driver accept a request
exports.acceptRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { driverId } = req.body;
    
    // TODO: Ideally wrap in a transaction, checking if status is still SEARCHING
    const request = await prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        driverId,
        status: 'ACCEPTED'
      }
    });
    
    // Also update driver status to BUSY
    await prisma.driver.update({
      where: { id: driverId },
      data: { status: 'BUSY' }
    });
    
    res.status(200).json({ success: true, serviceRequest: request });
  } catch (error) {
    console.error('Accept Request Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update status (ARRIVED, IN_TRANSIT, COMPLETED)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, driverId } = req.body; // pass driverId to possibly clear BUSY status
    
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
    
    res.status(200).json({ success: true, serviceRequest: request });
  } catch (error) {
    console.error('Update Request Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get requests by status (for Driver app to find jobs)
exports.getPendingRequests = async (req, res) => {
  try {
    // A more advanced system would filter by distance using PostGIS or Haversine
    const requests = await prisma.serviceRequest.findMany({
      where: { status: 'SEARCHING' },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Get Pending Requests Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
