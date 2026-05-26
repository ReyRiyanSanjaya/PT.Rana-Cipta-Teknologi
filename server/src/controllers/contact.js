const prisma = require('../config/database'); // [FIX] Singleton Prisma
const { notifyAdmin } = require('../utils/notification');

exports.createMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    const newMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject: subject || 'No Subject',
        message,
        status: 'UNREAD'
      }
    });

    // Notify Admin
    await notifyAdmin(
      `Pesan Baru: ${subject || 'No Subject'}`,
      `Dari: ${name} (${email}). ${message.substring(0, 50)}...`
    );

    res.status(201).json({ success: true, message: 'Pesan berhasil terkirim!', data: newMessage });
  } catch (error) {
    console.error("Contact Error:", error);
    res.status(500).json({ success: false, message: 'Gagal mengirim pesan', error: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil pesan', error: error.message });
  }
};

exports.updateMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // READ, ARCHIVED, etc.
    
    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { status }
    });
    
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal update status', error: error.message });
  }
};
