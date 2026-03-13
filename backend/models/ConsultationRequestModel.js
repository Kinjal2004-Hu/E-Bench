const mongoose = require('mongoose');

const consultationRequestSchema = new mongoose.Schema({
  consultantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultant',
    required: true,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  clientName: { type: String, required: true },
  legalCategory: { type: String, required: true },
  requestedDate: { type: String, required: true },  // YYYY-MM-DD
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true });

consultationRequestSchema.index({ consultantId: 1, status: 1 });

module.exports = mongoose.model('ConsultationRequest', consultationRequestSchema);
