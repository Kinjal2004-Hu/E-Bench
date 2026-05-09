const mongoose = require('mongoose');

const quizAnswerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  selectedOption: { type: String, default: '' },
  correct: { type: Boolean, default: false },
}, { _id: false });

const lessonProgressSchema = new mongoose.Schema({
  lessonId: { type: String, required: true },
  lessonTitle: { type: String, default: '' },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  quizAnswers: { type: [quizAnswerSchema], default: [] },
  quizScore: { type: Number, default: 0 },
  quizTotal: { type: Number, default: 0 },
  source: { type: String, enum: ['static', 'news', 'rag'], default: 'static' },
}, { _id: false });

const learningProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
    unique: true,
  },
  dailyStreak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastActive: { type: Date, default: null },
  },
  lessons: { type: [lessonProgressSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('LearningProgress', learningProgressSchema);
