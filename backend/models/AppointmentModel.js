const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
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
  consultationType: {
    type: String,
    enum: ['Chat', 'Video', 'Office Meeting', 'Phone Call'],
    required: true,
  },
  caseType: { type: String, required: true },
  date: { type: String, required: true },   // YYYY-MM-DD
  time: { type: String, required: true },   // HH:MM
  status: {
    type: String,
    enum: ['confirmed', 'rescheduled', 'pending'],
    default: 'pending',
  },
}, { timestamps: true });

appointmentSchema.index({ consultantId: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
