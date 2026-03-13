const express = require('express');
const ForumPost = require('../models/ForumPostModel');

const router = express.Router();

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

router.get('/posts', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const category = (req.query.category || 'All').toString().trim();
    const sort = (req.query.sort || 'latest').toString().trim().toLowerCase();
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 6), 50);

    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { tags: { $elemMatch: { $regex: q, $options: 'i' } } },
      ];
    }

    let sortBy = { createdAt: -1 };
    if (sort === 'trending') {
      sortBy = { upvotes: -1, replies: -1, createdAt: -1 };
    } else if (sort === 'helpful') {
      sortBy = { solved: -1, upvotes: -1, createdAt: -1 };
    }

    const total = await ForumPost.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const items = await ForumPost.find(query).sort(sortBy).skip(skip).limit(limit).lean();

    return res.json({
      items,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Forum list error:', error);
    return res.status(500).json({ error: 'Failed to fetch forum posts' });
  }
});

router.get('/posts/:id', async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id).lean();
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    return res.json(post);
  } catch (error) {
    return res.status(404).json({ error: 'Post not found' });
  }
});

router.post('/posts', async (req, res) => {
  try {
    const { title, content, category, tags, author, authorRole } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({ error: 'Title, content, and category are required' });
    }

    const normalizedTags = Array.isArray(tags)
      ? tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8)
      : String(tags || '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 8);

    const post = await ForumPost.create({
      title: String(title).trim(),
      content: String(content).trim(),
      category: String(category).trim(),
      tags: normalizedTags,
      author: author ? String(author).trim() : 'Community Member',
      authorRole: authorRole === 'lawyer' ? 'lawyer' : 'member',
    });

    return res.status(201).json(post);
  } catch (error) {
    console.error('Forum create error:', error);
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

module.exports = router;
