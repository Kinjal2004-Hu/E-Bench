const path = require('path');
const Consultant = require('../models/ConsultantModel');
const Appointment = require('../models/AppointmentModel');
const ConsultationRequest = require('../models/ConsultationRequestModel');
const Chat = require('../models/ChatModel');

// ── helpers ──────────────────────────────────────────────────────────────────

const requireConsultant = (req, res) => {
  if (req.user.userType !== 'consultant') {
    res.status(403).json({ error: 'Consultant access required' });
    return false;
  }
  return true;
};

// ── GET /api/lawyer/stats ─────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    if (!requireConsultant(req, res)) return;
    const consultantId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const [todaysAppointments, pendingRequests, totalChats] = await Promise.all([
      Appointment.countDocuments({ consultantId, date: today }),
      ConsultationRequest.countDocuments({ consultantId, status: 'pending' }),
      Chat.countDocuments({
        participants: { $elemMatch: { participant: consultantId, participantModel: 'Consultant' } },
      }),
    ]);

    return res.json({
      todaysAppointments,
      pendingRequests,
      totalClients: totalChats,
      totalEarnings: 0,
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// ── GET /api/lawyer/profile ───────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    if (!requireConsultant(req, res)) return;
    const consultant = await Consultant.findById(req.user.id).select('-password');
    if (!consultant) return res.status(404).json({ error: 'Profile not found' });
    return res.json(consultant);
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// ── PUT /api/lawyer/profile ───────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    if (!requireConsultant(req, res)) return;
    const allowed = [
      'fullName', 'specialization', 'professionalSummary',
      'experience', 'languages', 'consultationFee', 'availability', 'photoUrl',
    ];
    const update = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });

    const consultant = await Consultant.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    ).select('-password');

    return res.json(consultant);
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

// ── GET /api/lawyer/appointments ──────────────────────────────────────────────
const getAppointments = async (req, res) => {
  try {
    if (!requireConsultant(req, res)) return;
    const { date } = req.query;
    const query = { consultantId: req.user.id };
    if (date) query.date = date;

    const appointments = await Appointment.find(query).sort({ date: 1, time: 1 });
    return res.json(appointments);
  } catch (err) {
    console.error('getAppointments error:', err);
    return res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

// ── POST /api/lawyer/appointments ─────────────────────────────────────────────
const createAppointment = async (req, res) => {
  try {
    if (!requireConsultant(req, res)) return;
    const { clientName, consultationType, caseType, date, time, clientId } = req.body;
    if (!clientName || !consultationType || !caseType || !date || !time) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const apt = await Appointment.create({
      consultantId: req.user.id,
      clientId: clientId || undefined,
      clientName,
      consultationType,
      caseType,
      date,
      time,
    });
    return res.status(201).json(apt);
  } catch (err) {
    console.error('createAppointment error:', err);
    return res.status(500).json({ error: 'Failed to create appointment' });
  }
};

// ── PATCH /api/lawyer/appointments/:id/status ─────────────────────────────────
const updateAppointmentStatus = async (req, res) => {
  try {
    if (!requireConsultant(req, res)) return;
    const { status } = req.body;
    if (!['confirmed', 'rescheduled', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const apt = await Appointment.findOneAndUpdate(
      { _id: req.params.id, consultantId: req.user.id },
      { $set: { status } },
      { new: true }
    );
    if (!apt) return res.status(404).json({ error: 'Appointment not found' });
    return res.json(apt);
  } catch (err) {
    console.error('updateAppointmentStatus error:', err);
    return res.status(500).json({ error: 'Failed to update appointment' });
  }
};

// ── DELETE /api/lawyer/appointments/:id ───────────────────────────────────────
const deleteAppointment = async (req, res) => {
  try {
    if (!requireConsultant(req, res)) return;
    const apt = await Appointment.findOneAndDelete({ _id: req.params.id, consultantId: req.user.id });
    if (!apt) return res.status(404).json({ error: 'Appointment not found' });
    return res.json({ message: 'Appointment deleted' });
  } catch (err) {
    console.error('deleteAppointment error:', err);
    return res.status(500).json({ error: 'Failed to delete appointment' });
  }
};

// ── GET /api/lawyer/consultation-requests ─────────────────────────────────────
const getConsultationRequests = async (req, res) => {
  try {
    if (!requireConsultant(req, res)) return;
    const { status } = req.query;
    const query = { consultantId: req.user.id };
    if (status) query.status = status;

    const requests = await ConsultationRequest.find(query).sort({ createdAt: -1 });
    return res.json(requests);
  } catch (err) {
    console.error('getConsultationRequests error:', err);
    return res.status(500).json({ error: 'Failed to fetch consultation requests' });
  }
};

// ── POST /api/lawyer/consultation-requests ────────────────────────────────────
// Called by a user (client) to request a consultation with a specific lawyer
const createConsultationRequest = async (req, res) => {
  try {
    const { consultantId, legalCategory, requestedDate, message, clientName } = req.body;
    if (!consultantId || !legalCategory || !requestedDate || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const name = clientName || req.user?.name || 'Client';
    const createdRequest = await ConsultationRequest.create({
      consultantId,
      clientId: req.user?.id || undefined,
      clientName: name,
      legalCategory,
      requestedDate,
      message,
    });
    return res.status(201).json(createdRequest);
  } catch (err) {
    console.error('createConsultationRequest error:', err);
    return res.status(500).json({ error: 'Failed to create consultation request' });
  }
};

// ── PATCH /api/lawyer/consultation-requests/:id/status ────────────────────────
const updateConsultationStatus = async (req, res) => {
  try {
    if (!requireConsultant(req, res)) return;
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const updated = await ConsultationRequest.findOneAndUpdate(
      { _id: req.params.id, consultantId: req.user.id },
      { $set: { status } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Request not found' });
    return res.json(updated);
  } catch (err) {
    console.error('updateConsultationStatus error:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
};

// ── GET /api/lawyer/case-files ────────────────────────────────────────────────
const getCaseFiles = async (req, res) => {
  try {
    if (!requireConsultant(req, res)) return;
    // Files are stored with consultantId stamped into filename via multer
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(uploadsDir)
      .filter((f) => f.startsWith(`${req.user.id}_`))
      .map((f) => {
        const stats = fs.statSync(path.join(uploadsDir, f));
        // filename format: {consultantId}_{clientName}_{originalname}
        const parts = f.split('_').slice(1); // remove consultantId prefix
        const clientName = parts[0] || '—';
        const originalName = parts.slice(1).join('_');
        return {
          id: f,
          fileName: originalName || f,
          clientName,
          uploadDate: stats.mtime.toISOString().split('T')[0],
          fileSize: `${(stats.size / 1024).toFixed(0)} KB`,
          fileType: (originalName.split('.').pop() || 'FILE').toUpperCase(),
        };
      });
    return res.json(files);
  } catch (err) {
    console.error('getCaseFiles error:', err);
    return res.status(500).json({ error: 'Failed to fetch case files' });
  }
};

// ── POST /api/lawyer/case-files ───────────────────────────────────────────────
// handled inline in routes with multer

// ── GET /api/lawyer/case-files/:id/download ───────────────────────────────────
const downloadCaseFile = async (req, res) => {
  try {
    if (!requireConsultant(req, res)) return;
    const fileId = req.params.id;
    // Security: ensure file belongs to this consultant
    if (!fileId.startsWith(`${req.user.id}_`)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', 'uploads', fileId);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    return res.download(filePath);
  } catch (err) {
    console.error('downloadCaseFile error:', err);
    return res.status(500).json({ error: 'Failed to download file' });
  }
};

// ── DELETE /api/lawyer/case-files/:id ─────────────────────────────────────────
const deleteCaseFile = async (req, res) => {
  try {
    if (!requireConsultant(req, res)) return;
    const fileId = req.params.id;
    if (!fileId.startsWith(`${req.user.id}_`)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', 'uploads', fileId);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    fs.unlinkSync(filePath);
    return res.json({ message: 'File deleted' });
  } catch (err) {
    console.error('deleteCaseFile error:', err);
    return res.status(500).json({ error: 'Failed to delete file' });
  }
};

module.exports = {
  getDashboardStats,
  getProfile,
  updateProfile,
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  getConsultationRequests,
  createConsultationRequest,
  updateConsultationStatus,
  getCaseFiles,
  downloadCaseFile,
  deleteCaseFile,
};
