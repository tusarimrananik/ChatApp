const express = require('express');
const cors = require('cors');
const app = express();

const mongoose = require('mongoose');
const http = require('http').Server(app);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatAppDB').then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

const io = require('socket.io')(http, {
    cors: {
        origin: 'http://127.0.0.1:5500',
        methods: ['GET', 'POST'],
        credentials: true,
        optionsSuccessStatus: 200
    }
});

const users = {};

app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST'],
    credentials: true
}));

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('new-user-joined', (name) => {
        console.log('New user:', name);
        users[socket.id] = name;
        socket.broadcast.emit('user-joined', name);
    });

    socket.on('send', (message) => {
        socket.broadcast.emit('receive', { message: message, name: users[socket.id] });
    });

});

http.listen(8000, () => {
    console.log('Server is running on port 8000');
});
