const User = require('../models/UserModel');
const CaseAnalysis = require('../models/CaseAnalysisModel');
const Chat = require('../models/ChatModel');

// ── helpers ──────────────────────────────────────────────────────────────────

const requireUser = (req, res) => {
  if (req.user.userType !== 'user' && req.user.userType !== 'consultant') {
    res.status(403).json({ error: 'Authenticated user required' });
    return false;
  }
  return true;
};

// ── GET /api/user/profile ─────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// ── PUT /api/user/profile ─────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const allowed = ['fullName', 'phone', 'organization', 'location', 'bio', 'role', 'barId'];
    const update = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

// ── GET /api/user/stats ───────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const [totalCases, totalContracts, totalSummaries, totalChats] = await Promise.all([
      CaseAnalysis.countDocuments({ userId, type: 'case' }),
      CaseAnalysis.countDocuments({ userId, type: 'contract' }),
      CaseAnalysis.countDocuments({ userId, type: 'summary' }),
      Chat.countDocuments({
        participants: { $elemMatch: { participant: userId, participantModel: 'User' } },
      }),
    ]);

    return res.json({ totalCases, totalContracts, totalSummaries, totalChats });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// ── GET /api/user/analyses ─────────────────────────────────────────────────────
const getAnalyses = async (req, res) => {
  try {
    const { type } = req.query;
    const query = { userId: req.user.id };
    if (type) query.type = type;

    const analyses = await CaseAnalysis.find(query)
      .sort({ createdAt: -1 })
      .select('_id type title description riskScore createdAt');
    return res.json(analyses);
  } catch (err) {
    console.error('getAnalyses error:', err);
    return res.status(500).json({ error: 'Failed to fetch analyses' });
  }
};

// ── GET /api/user/analyses/:id ────────────────────────────────────────────────
const getAnalysisById = async (req, res) => {
  try {
    const analysis = await CaseAnalysis.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    return res.json(analysis);
  } catch (err) {
    console.error('getAnalysisById error:', err);
    return res.status(500).json({ error: 'Failed to fetch analysis' });
  }
};

// ── POST /api/user/analyses ───────────────────────────────────────────────────
const saveAnalysis = async (req, res) => {
  try {
    const { type, title, description, aiAnswer, sections, userRights, legalSteps, riskScore } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const analysis = await CaseAnalysis.create({
      userId: req.user.id,
      type: type || 'case',
      title,
      description: description || '',
      aiAnswer: aiAnswer || '',
      sections: sections || [],
      userRights: userRights || [],
      legalSteps: legalSteps || [],
      riskScore: riskScore || 0,
    });

    return res.status(201).json(analysis);
  } catch (err) {
    console.error('saveAnalysis error:', err);
    return res.status(500).json({ error: 'Failed to save analysis' });
  }
};

// ── DELETE /api/user/analyses/:id ─────────────────────────────────────────────
const deleteAnalysis = async (req, res) => {
  try {
    const analysis = await CaseAnalysis.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    return res.json({ message: 'Analysis deleted' });
  } catch (err) {
    console.error('deleteAnalysis error:', err);
    return res.status(500).json({ error: 'Failed to delete analysis' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getDashboardStats,
  getAnalyses,
  getAnalysisById,
  saveAnalysis,
  deleteAnalysis,
};
