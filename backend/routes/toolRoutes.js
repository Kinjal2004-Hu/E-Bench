const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  caseAnalyzer,
  contractRisk,
  caseSummarizer,
} = require('../controller/toolController');

const router = express.Router();

// All tool routes require authentication
router.use(authMiddleware);

// POST /api/tools/case-analyzer   — Analyze a case via RAG + auto-save
router.post('/case-analyzer', caseAnalyzer);

// POST /api/tools/contract-risk   — Analyze contract risk via RAG + auto-save
router.post('/contract-risk', contractRisk);

// POST /api/tools/case-summarizer — Summarize a case file via RAG + auto-save
router.post('/case-summarizer', caseSummarizer);

module.exports = router;
