const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    author: {
      type: String,
      default: 'Community Member',
      trim: true,
      maxlength: 80,
    },
    authorAvatar: {
      type: String,
      default: 'CM',
      trim: true,
      maxlength: 4,
    },
    authorReputation: {
      type: Number,
      default: 100,
      min: 0,
    },
    authorRole: {
      type: String,
      enum: ['member', 'lawyer'],
      default: 'member',
    },
    replies: {
      type: Number,
      default: 0,
      min: 0,
    },
    upvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    solved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

forumPostSchema.index({ title: 'text', content: 'text', category: 'text', tags: 'text' });

module.exports = mongoose.model('ForumPost', forumPostSchema);
