const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    discriminator: String,
    avatar: String,
    email: String,
    age: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    experience: String,
    discordTag: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    reviewedBy: String,
    reviewedAt: Date,
    reviewNote: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Application', applicationSchema);
