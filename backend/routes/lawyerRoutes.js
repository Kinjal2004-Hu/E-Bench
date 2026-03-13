const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const {
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
} = require('../controller/lawyerController');

const router = express.Router();

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer storage: prefix with consultantId to scope files
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const clientName = (req.body.clientName || 'unknown').replace(/[^a-z0-9]/gi, '_');
    const safe = file.originalname.replace(/[^a-z0-9.\-_]/gi, '_');
    cb(null, `${req.user.id}_${clientName}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('File type not allowed'));
  },
});

// All routes require auth
router.use(authMiddleware);

// Dashboard stats
router.get('/stats', getDashboardStats);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Appointments
router.get('/appointments', getAppointments);
router.post('/appointments', createAppointment);
router.patch('/appointments/:id/status', updateAppointmentStatus);
router.delete('/appointments/:id', deleteAppointment);

// Consultation requests
router.get('/consultation-requests', getConsultationRequests);
router.post('/consultation-requests', createConsultationRequest);
router.patch('/consultation-requests/:id/status', updateConsultationStatus);

// Case files
router.get('/case-files', getCaseFiles);
router.post('/case-files', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const ext = path.extname(req.file.originalname).toUpperCase().replace('.', '');
  const parts = req.file.filename.split('_').slice(1);
  return res.status(201).json({
    id: req.file.filename,
    fileName: req.file.originalname,
    clientName: req.body.clientName || '—',
    uploadDate: new Date().toISOString().split('T')[0],
    fileSize: `${(req.file.size / 1024).toFixed(0)} KB`,
    fileType: ext,
  });
});
router.get('/case-files/:id/download', downloadCaseFile);
router.delete('/case-files/:id', deleteCaseFile);

module.exports = router;
