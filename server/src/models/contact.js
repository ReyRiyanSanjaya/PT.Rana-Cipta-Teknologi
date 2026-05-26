// contact.js — Model wrapper menggunakan Prisma (PostgreSQL)
// Model ContactMessage sudah ada di schema.prisma (line ~956)
// Fields: id, name, email, subject, message, status (UNREAD/READ/ARCHIVED), createdAt

const prisma = require('../config/database'); // [FIX] Singleton Prisma

const Contact = {
  /**
   * Ambil semua pesan, diurutkan dari terbaru
   */
  find: async () => {
    return prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Buat pesan baru
   */
  create: async (data) => {
    const { name, email, subject, message } = data;
    return prisma.contactMessage.create({
      data: { name, email, subject, message, status: 'UNREAD' }
    });
  },

  /**
   * Tandai pesan sudah dibaca
   */
  markRead: async (id) => {
    return prisma.contactMessage.update({
      where: { id },
      data: { status: 'READ' }
    });
  },

  /**
   * Arsipkan pesan
   */
  archive: async (id) => {
    return prisma.contactMessage.update({
      where: { id },
      data: { status: 'ARCHIVED' }
    });
  },

  /**
   * Hapus pesan
   */
  delete: async (id) => {
    return prisma.contactMessage.delete({ where: { id } });
  }
};

module.exports = Contact;
