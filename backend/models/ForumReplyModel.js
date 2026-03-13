const mongoose = require('mongoose');

const forumReplySchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ForumPost',
      required: true,
      index: true,
    },
    user: {
      type: String,
      default: 'Community Member',
      trim: true,
      maxlength: 80,
    },
    role: {
      type: String,
      enum: ['member', 'lawyer'],
      default: 'member',
    },
    avatar: {
      type: String,
      default: 'CM',
      trim: true,
      maxlength: 4,
    },
    reputation: {
      type: Number,
      default: 100,
      min: 0,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    upvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    isBestAnswer: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

forumReplySchema.index({ postId: 1, createdAt: -1 });

module.exports = mongoose.model('ForumReply', forumReplySchema);
