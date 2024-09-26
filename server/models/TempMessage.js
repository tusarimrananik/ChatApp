const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    expirationTime: { // Add expiration time
        type: Date,
        required: true
    }
});

module.exports = mongoose.model('TempMessage', messageSchema);