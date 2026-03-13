const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  document: String,
  section_number: Number,
  title: String,
  snippet: String,
  punishment_summary: String,
  score: Number,
}, { _id: false });

const caseAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['case', 'contract', 'summary'],
    required: true,
    default: 'case',
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  description: {
    type: String,
    default: '',
    maxlength: 5000,
  },
  aiAnswer: {
    type: String,
    default: '',
  },
  sections: {
    type: [sectionSchema],
    default: [],
  },
  userRights: {
    type: [String],
    default: [],
  },
  legalSteps: {
    type: [String],
    default: [],
  },
  riskScore: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

caseAnalysisSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('CaseAnalysis', caseAnalysisSchema);
