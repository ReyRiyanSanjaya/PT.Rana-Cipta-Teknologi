const prisma = require('../config/database'); // [FIX] Singleton Prisma

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
    
    res.status(201).json({ success: true, driver: newDriver });
  } catch (error) {
    console.error('Register Driver Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getDriverProfile = async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { serviceRequests: true }
    });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    
    res.status(200).json({ success: true, driver });
  } catch (error) {
    console.error('Get Driver Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status, latitude, longitude } = req.body; // status: OFFLINE, ONLINE, BUSY
    
    const driver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        status,
        ...(latitude && { latitude }),
        ...(longitude && { longitude }),
      }
    });
    
    res.status(200).json({ success: true, driver });
  } catch (error) {
    console.error('Update Driver Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
