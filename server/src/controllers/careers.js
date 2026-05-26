const prisma = require('../config/database'); // [FIX] Singleton Prisma
const { successResponse, errorResponse } = require('../utils/response');
const { notifyAdmin } = require('../utils/notification');

exports.createApplication = async (req, res) => {
  try {
    const { name, email, phone, positionTitle, positionDept, seniority, resumeLink, portfolioLink, coverLetter } = req.body;
    
    // Handle file upload if present
    let finalResumeLink = resumeLink;
    if (req.file) {
        finalResumeLink = `/uploads/cvs/${req.file.filename}`;
    }

    if (!name || !email || !positionTitle) {
      return errorResponse(res, "Nama, email, dan judul posisi wajib diisi", 400);
    }
    const app = await prisma.jobApplication.create({
      data: {
        name: String(name),
        email: String(email).toLowerCase(),
        phone: phone ? String(phone) : null,
        positionTitle: String(positionTitle),
        positionDept: positionDept ? String(positionDept) : null,
        seniority: seniority ? String(seniority) : null,
        resumeLink: finalResumeLink ? String(finalResumeLink) : null,
        portfolioLink: portfolioLink ? String(portfolioLink) : null,
        coverLetter: coverLetter ? String(coverLetter) : null
      }
    });
    try {
      await notifyAdmin(
        `Lamaran Baru: ${app.positionTitle}`,
        `Dari: ${app.name} (${app.email}). Dept: ${app.positionDept || '-'}`
      );
    } catch (_) {}
    return successResponse(res, app, "Lamaran berhasil dikirim");
  } catch (error) {
    return errorResponse(res, "Gagal mengirim lamaran", 500, error);
  }
};

exports.getApplications = async (req, res) => {
  try {
    const { status, q } = req.query;
    const where = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { positionTitle: { contains: q, mode: 'insensitive' } },
        { positionDept: { contains: q, mode: 'insensitive' } }
      ];
    }
    const list = await prisma.jobApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return successResponse(res, list);
  } catch (error) {
    return errorResponse(res, "Gagal mengambil data lamaran", 500, error);
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!id || !status) return errorResponse(res, "ID dan status diperlukan", 400);
    const updated = await prisma.jobApplication.update({
      where: { id },
      data: { status }
    });
    return successResponse(res, updated, "Status diperbarui");
  } catch (error) {
    return errorResponse(res, "Gagal memperbarui status", 500, error);
  }
};
