const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    username: String,
    status: {
        type: String,
        enum: ['online', 'idle', 'dnd', 'offline']
    },
    activityType: {
        type: String,
        enum: ['message', 'voice', 'status_change']
    },
    channelId: String,
    channelName: String,
    voiceDuration: Number, // saniye cinsinden
    messageCount: Number,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index'ler (hızlı sorgu için)
activitySchema.index({ guildId: 1, timestamp: -1 });
activitySchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Activity', activitySchema);
