const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    username: String,
    avatar: String,
    totalMessages: {
        type: Number,
        default: 0
    },
    totalVoiceTime: {
        type: Number,
        default: 0 // saniye cinsinden
    },
    lastSeen: Date,
    lastStatus: String,
    afkSince: Date,
    dailyStats: [{
        date: Date,
        messages: Number,
        voiceTime: Number,
        status: String
    }],
    weeklyActive: {
        type: Boolean,
        default: false
    },
    monthlyActive: {
        type: Boolean,
        default: false
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

userStatsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('UserStats', userStatsSchema);
