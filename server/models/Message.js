const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({

    username: { type: String, required: true }, // Store the username directly
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

messageSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
