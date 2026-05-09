const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const LearningProgress = require('../models/LearningProgressModel');

const router = express.Router();

router.use(authMiddleware);

// ── GET /api/user/microlearning/progress ─────────────────────────────────
router.get('/progress', async (req, res) => {
  try {
    let progress = await LearningProgress.findOne({ userId: req.user.id });
    if (!progress) {
      progress = await LearningProgress.create({
        userId: req.user.id,
        dailyStreak: { current: 0, longest: 0, lastActive: null },
        lessons: [],
      });
    }
    return res.json(progress);
  } catch (err) {
    console.error('getLearningProgress error:', err);
    return res.status(500).json({ error: 'Failed to fetch learning progress' });
  }
});

// ── POST /api/user/microlearning/progress/lesson ─────────────────────────
router.post('/progress/lesson', async (req, res) => {
  try {
    const { lessonId, lessonTitle, source } = req.body;
    if (!lessonId) return res.status(400).json({ error: 'lessonId is required' });

    let progress = await LearningProgress.findOne({ userId: req.user.id });
    if (!progress) {
      progress = await LearningProgress.create({
        userId: req.user.id,
        dailyStreak: { current: 0, longest: 0, lastActive: null },
        lessons: [],
      });
    }

    const existingLesson = progress.lessons.find(l => l.lessonId === lessonId);
    if (existingLesson) {
      existingLesson.completed = true;
      existingLesson.completedAt = new Date();
      if (lessonTitle) existingLesson.lessonTitle = lessonTitle;
      if (source) existingLesson.source = source;
    } else {
      progress.lessons.push({
        lessonId,
        lessonTitle: lessonTitle || '',
        completed: true,
        completedAt: new Date(),
        source: source || 'static',
      });
    }

    // Update daily streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = progress.dailyStreak.lastActive
      ? new Date(progress.dailyStreak.lastActive)
      : null;

    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day, don't increment
      } else if (diffDays === 1) {
        progress.dailyStreak.current += 1;
      } else {
        progress.dailyStreak.current = 1;
      }
    } else {
      progress.dailyStreak.current = 1;
    }

    progress.dailyStreak.lastActive = new Date();
    if (progress.dailyStreak.current > progress.dailyStreak.longest) {
      progress.dailyStreak.longest = progress.dailyStreak.current;
    }

    await progress.save();
    return res.json(progress);
  } catch (err) {
    console.error('saveLessonProgress error:', err);
    return res.status(500).json({ error: 'Failed to save lesson progress' });
  }
});

// ── POST /api/user/microlearning/progress/quiz ───────────────────────────
router.post('/progress/quiz', async (req, res) => {
  try {
    const { lessonId, lessonTitle, answers, score, total, source } = req.body;
    if (!lessonId) return res.status(400).json({ error: 'lessonId is required' });

    let progress = await LearningProgress.findOne({ userId: req.user.id });
    if (!progress) {
      progress = await LearningProgress.create({
        userId: req.user.id,
        dailyStreak: { current: 0, longest: 0, lastActive: null },
        lessons: [],
      });
    }

    const existingLesson = progress.lessons.find(l => l.lessonId === lessonId);
    const quizAnswers = Array.isArray(answers) ? answers : [];

    if (existingLesson) {
      existingLesson.quizAnswers = quizAnswers;
      existingLesson.quizScore = score || 0;
      existingLesson.quizTotal = total || 0;
      if (lessonTitle) existingLesson.lessonTitle = lessonTitle;
      if (source) existingLesson.source = source;
    } else {
      progress.lessons.push({
        lessonId,
        lessonTitle: lessonTitle || '',
        quizAnswers,
        quizScore: score || 0,
        quizTotal: total || 0,
        source: source || 'static',
      });
    }

    await progress.save();
    return res.json(progress);
  } catch (err) {
    console.error('saveQuizProgress error:', err);
    return res.status(500).json({ error: 'Failed to save quiz progress' });
  }
});

module.exports = router;
