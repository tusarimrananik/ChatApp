const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http').Server(express());
const User = require('./models/User');
const Message = require('./models/Message');
const app = express();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatAppDB')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
const io = require('socket.io')(http, {
    cors: {
        origin: 'http://127.0.0.1:5500',
        methods: ['GET', 'POST'],
        credentials: true,
        optionsSuccessStatus: 200
    }
});
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST'],
    credentials: true
}));
const users = {};
const fetchRecentMessages = async (limit = 20) => {
    return await Message.find().sort({ timestamp: -1 }).limit(limit);
};



const fetchEarlierMessages = async (timestamp, limit = 20) => {
    return await Message.find({ timestamp: { $lt: timestamp } })
        .sort({ timestamp: -1 })
        .limit(limit);
};


io.on('connection', (socket) => {
    console.log('A user connected');
    fetchRecentMessages().then(messages => {
        socket.emit('loadMessages', messages.reverse());
    });





    socket.on('loadEarlierMessages', (timestamp) => {
        fetchEarlierMessages(timestamp).then(messages => {
            socket.emit('displayEarlierMessages', messages.reverse());
        });
    });





    socket.on('new-user-joined', async (name) => {
        console.log('New user:', name);
        try {
            const newUser = new User({ name });
            await newUser.save();
            console.log('User saved:', newUser);

            users[socket.id] = newUser._id;
        } catch (error) {
            console.error('Error saving user:', error.message);
        }

        socket.broadcast.emit('user-joined', name);
    });
    socket.on('send', async (message) => {
        socket.broadcast.emit('receive', { message: message, name: users[socket.id] });
        try {
            const newMessage = new Message({
                userId: users[socket.id],
                text: message
            });
            await newMessage.save();
            console.log('Message stored:', newMessage);
        } catch (error) {
            console.error('Error storing message:', error.message);
        }
    });
});

http.listen(8000, () => {
    console.log('Server is running on port 8000');
});
