const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
    {
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'participants.participantModel',
        },
        participantModel: {
            type: String,
            required: true,
            enum: ['User', 'Consultant'],
        },
    },
    { _id: false }
);

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'messages.senderModel',
        },
        senderModel: {
            type: String,
            required: true,
            enum: ['User', 'Consultant'],
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 4000,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

const chatSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            maxlength: 120,
        },
        isDirect: {
            type: Boolean,
            default: true,
        },
        participants: {
            type: [participantSchema],
            validate: {
                validator: (value) => Array.isArray(value) && value.length >= 2,
                message: 'At least 2 participants are required',
            },
            required: true,
        },
        messages: {
            type: [messageSchema],
            default: [],
        },
        lastMessage: {
            type: String,
            trim: true,
            default: '',
        },
        lastMessageAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

chatSchema.index({ 'participants.participant': 1, 'participants.participantModel': 1 });
chatSchema.index({ updatedAt: -1 });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;