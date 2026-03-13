const express = require('express');
const mongoose = require('mongoose');
const ForumPost = require('../models/ForumPostModel');
const ForumReply = require('../models/ForumReplyModel');

const router = express.Router();

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/topics/trending', async (req, res) => {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit, 5), 12);

    const posts = await ForumPost.find({})
      .sort({ upvotes: -1, replies: -1, createdAt: -1 })
      .limit(100)
      .select({ title: 1, tags: 1 })
      .lean();

    const tagScores = new Map();

    posts.forEach((post) => {
      const weight = 1;
      (post.tags || []).forEach((tagRaw) => {
        const tag = String(tagRaw || '').trim();
        if (!tag) {
          return;
        }
        const current = tagScores.get(tag) || 0;
        tagScores.set(tag, current + weight);
      });
    });

    const fromTags = [...tagScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => ({ label: tag, href: `/community?tag=${encodeURIComponent(tag)}` }));

    const fallbackFromTitles = posts
      .slice(0, limit)
      .map((post) => ({
        label: post.title,
        href: `/community?q=${encodeURIComponent(post.title.split(' ').slice(0, 4).join(' '))}`,
      }));

    const items = fromTags.length ? fromTags : fallbackFromTitles;
    return res.json({ items });
  } catch (error) {
    console.error('Forum trending topics error:', error);
    return res.status(500).json({ error: 'Failed to fetch trending topics' });
  }
});

router.get('/posts', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const category = (req.query.category || 'All').toString().trim();
    const tag = (req.query.tag || 'All').toString().trim();
    const sort = (req.query.sort || 'latest').toString().trim().toLowerCase();
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 6), 50);

    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (tag && tag !== 'All') {
      query.tags = { $elemMatch: { $regex: `^${escapeRegex(tag)}$`, $options: 'i' } };
    }

    if (q) {
      const safeQuery = escapeRegex(q);
      query.$or = [
        { title: { $regex: safeQuery, $options: 'i' } },
        { content: { $regex: safeQuery, $options: 'i' } },
        { category: { $regex: safeQuery, $options: 'i' } },
        { tags: { $elemMatch: { $regex: safeQuery, $options: 'i' } } },
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
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Post not found' });
    }
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
    const { title, content, category, tags, author, authorRole, authorAvatar, authorReputation, views } = req.body;

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
      authorAvatar: authorAvatar ? String(authorAvatar).trim().slice(0, 4) : 'CM',
      authorReputation: Number.isFinite(Number(authorReputation)) ? Math.max(0, Number(authorReputation)) : 100,
      authorRole: authorRole === 'lawyer' ? 'lawyer' : 'member',
      views: Number.isFinite(Number(views)) ? Math.max(0, Number(views)) : 0,
    });

    return res.status(201).json(post);
  } catch (error) {
    console.error('Forum create error:', error);
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

router.post('/posts/:id/upvote', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = await ForumPost.findByIdAndUpdate(id, { $inc: { upvotes: 1 } }, { new: true }).lean();
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    return res.json({ upvotes: post.upvotes });
  } catch (error) {
    console.error('Forum post upvote error:', error);
    return res.status(500).json({ error: 'Failed to upvote post' });
  }
});

router.get('/posts/:id/replies', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const postExists = await ForumPost.exists({ _id: id });
    if (!postExists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const items = await ForumReply.find({ postId: id }).sort({ isBestAnswer: -1, upvotes: -1, createdAt: 1 }).lean();
    return res.json({ items });
  } catch (error) {
    console.error('Forum replies list error:', error);
    return res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

router.post('/posts/:id/replies', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = await ForumPost.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { text, user, role, avatar, reputation } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    const createdReply = await ForumReply.create({
      postId: post._id,
      text: String(text).trim(),
      user: user ? String(user).trim() : 'Community Member',
      role: role === 'lawyer' ? 'lawyer' : 'member',
      avatar: avatar ? String(avatar).trim().slice(0, 4) : 'CM',
      reputation: Number.isFinite(Number(reputation)) ? Math.max(0, Number(reputation)) : 100,
    });

    post.replies += 1;
    await post.save();

    return res.status(201).json(createdReply);
  } catch (error) {
    console.error('Forum reply create error:', error);
    return res.status(500).json({ error: 'Failed to create reply' });
  }
});

router.post('/replies/:replyId/upvote', async (req, res) => {
  try {
    const { replyId } = req.params;
    if (!isValidObjectId(replyId)) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    const reply = await ForumReply.findByIdAndUpdate(replyId, { $inc: { upvotes: 1 } }, { new: true }).lean();
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    return res.json({ upvotes: reply.upvotes });
  } catch (error) {
    console.error('Forum reply upvote error:', error);
    return res.status(500).json({ error: 'Failed to upvote reply' });
  }
});

router.post('/posts/:id/mark-helpful', async (req, res) => {
  try {
    const { id } = req.params;
    const { replyId } = req.body;

    if (!isValidObjectId(id) || !isValidObjectId(replyId)) {
      return res.status(400).json({ error: 'Invalid post or reply id' });
    }

    const post = await ForumPost.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const reply = await ForumReply.findOne({ _id: replyId, postId: id });
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found for this post' });
    }

    await ForumReply.updateMany({ postId: id }, { $set: { isBestAnswer: false } });
    await ForumReply.updateOne({ _id: replyId }, { $set: { isBestAnswer: true } });
    post.solved = true;
    await post.save();

    return res.json({ ok: true });
  } catch (error) {
    console.error('Forum mark helpful error:', error);
    return res.status(500).json({ error: 'Failed to mark helpful answer' });
  }
});

module.exports = router;
