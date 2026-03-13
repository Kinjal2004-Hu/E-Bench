const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getProfile,
  updateProfile,
  getDashboardStats,
  getAnalyses,
  getAnalysisById,
  saveAnalysis,
  deleteAnalysis,
} = require('../controller/userController');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Dashboard stats
router.get('/stats', getDashboardStats);

// AI Analyses (cases, contracts, summaries)
router.get('/analyses', getAnalyses);          // ?type=case|contract|summary
router.get('/analyses/:id', getAnalysisById);
router.post('/analyses', saveAnalysis);
router.delete('/analyses/:id', deleteAnalysis);

module.exports = router;
