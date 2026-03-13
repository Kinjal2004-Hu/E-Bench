const CaseAnalysis = require('../models/CaseAnalysisModel');

const RAG_BASE = process.env.RAG_BASE_URL || 'http://localhost:8000';

// ── Helper: forward to RAG and return data ──────────────────────────────────

async function ragPost(path, body) {
  const res = await fetch(`${RAG_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = `RAG request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch { /* no-op */ }
    throw new Error(detail);
  }

  return res.json();
}

// ── POST /api/tools/case-analyzer ────────────────────────────────────────────
const caseAnalyzer = async (req, res) => {
  try {
    const { case_text, top_k = 7 } = req.body;
    if (!case_text || !case_text.trim()) {
      return res.status(400).json({ error: 'case_text is required' });
    }

    // Forward to RAG
    const ragResult = await ragPost('/tools/case-analyzer', { case_text, top_k });

    // Auto-save to database
    const analysis = await CaseAnalysis.create({
      userId: req.user.id,
      type: 'case',
      title: case_text.slice(0, 80) || 'Case Analysis',
      description: case_text.slice(0, 5000),
      aiAnswer: ragResult.ai_answer || '',
      sections: (ragResult.supporting_sections || []).map((s) => ({
        document: s.document,
        section_number: s.section_number,
        title: s.title,
        snippet: s.snippet,
        punishment_summary: s.punishment_summary,
        score: s.score,
      })),
      userRights: [],
      legalSteps: [],
      riskScore: 0,
    });

    return res.json({
      ...ragResult,
      savedAnalysisId: analysis._id,
    });
  } catch (err) {
    console.error('caseAnalyzer error:', err);
    return res.status(500).json({ error: err.message || 'Case analysis failed' });
  }
};

// ── POST /api/tools/contract-risk ────────────────────────────────────────────
const contractRisk = async (req, res) => {
  try {
    const { contract_text, top_k = 7 } = req.body;
    if (!contract_text || !contract_text.trim()) {
      return res.status(400).json({ error: 'contract_text is required' });
    }

    // Forward to RAG
    const ragResult = await ragPost('/tools/contract-risk', { contract_text, top_k });

    // Auto-save to database
    const analysis = await CaseAnalysis.create({
      userId: req.user.id,
      type: 'contract',
      title: contract_text.slice(0, 80) || 'Contract Risk Analysis',
      description: contract_text.slice(0, 5000),
      aiAnswer: ragResult.ai_answer || '',
      sections: (ragResult.supporting_sections || []).map((s) => ({
        document: s.document,
        section_number: s.section_number,
        title: s.title,
        snippet: s.snippet,
        punishment_summary: s.punishment_summary,
        score: s.score,
      })),
      userRights: [],
      legalSteps: ragResult.flagged_clauses || [],
      riskScore: ragResult.risk_score || 0,
    });

    return res.json({
      ...ragResult,
      savedAnalysisId: analysis._id,
    });
  } catch (err) {
    console.error('contractRisk error:', err);
    return res.status(500).json({ error: err.message || 'Contract risk analysis failed' });
  }
};

// ── POST /api/tools/case-summarizer ──────────────────────────────────────────
const caseSummarizer = async (req, res) => {
  try {
    const { document_text, top_k = 7 } = req.body;
    if (!document_text || !document_text.trim()) {
      return res.status(400).json({ error: 'document_text is required' });
    }

    // Forward to RAG
    const ragResult = await ragPost('/tools/case-summarizer', { document_text, top_k });

    // Auto-save to database
    const analysis = await CaseAnalysis.create({
      userId: req.user.id,
      type: 'summary',
      title: document_text.slice(0, 80) || 'Case Summary',
      description: document_text.slice(0, 5000),
      aiAnswer: ragResult.ai_answer || '',
      sections: (ragResult.supporting_sections || []).map((s) => ({
        document: s.document,
        section_number: s.section_number,
        title: s.title,
        snippet: s.snippet,
        punishment_summary: s.punishment_summary,
        score: s.score,
      })),
      userRights: [],
      legalSteps: [],
      riskScore: 0,
    });

    return res.json({
      ...ragResult,
      savedAnalysisId: analysis._id,
    });
  } catch (err) {
    console.error('caseSummarizer error:', err);
    return res.status(500).json({ error: err.message || 'Case summarization failed' });
  }
};

module.exports = {
  caseAnalyzer,
  contractRisk,
  caseSummarizer,
};
