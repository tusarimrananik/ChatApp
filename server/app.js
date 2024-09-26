const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http').Server(express());
const Message = require('./models/Message');
const TempMessage = require('./models/TempMessage');
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


const fetchMessages = async (timestamp = null, limit = 20) => {
    try {
        // Define query conditions
        const messageQuery = timestamp ? { timestamp: { $lt: timestamp } } : {}; // If timestamp is provided, fetch earlier messages, otherwise fetch the most recent ones.
        const tempMessageQuery = {
            ...messageQuery,
            expirationTime: { $gt: new Date() }, // Only include temporary messages that haven't expired
        };

        // Fetch regular (permanent) messages
        const regularMessages = await Message.find(messageQuery)
            .sort({ timestamp: -1 })
            .limit(limit);

        // Fetch temporary (expiring) messages
        const tempMessages = await TempMessage.find(tempMessageQuery)
            .sort({ timestamp: -1 })
            .limit(limit);

        // Merge both message arrays
        let allMessages = [...regularMessages, ...tempMessages];

        // Sort by timestamp in descending order after merging
        allMessages = allMessages.sort((a, b) => b.timestamp - a.timestamp);

        // Optionally limit the total number of messages after merging
        return allMessages.slice(0, limit);
    } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
    }
};




io.on('connection', (socket) => {


    //When a user connects of reload the page imediatly fetch the messages.
    fetchMessages().then(messages => {
        socket.emit('displayRecentMessages', messages.reverse());
    });


    // Event listener for loading earlier messages
    socket.on('loadOlderMessage', async (olderMessagTimestamp) => {
        try {
            // console.log(`Loading messages earlier than timestamp: ${olderMessagTimestamp}`);

            // Call fetchMessages with the olderMessagTimestamp
            const olderMessages = await fetchMessages(olderMessagTimestamp);

            // Send the messages back to the client
            socket.emit('displayOlderMessages', olderMessages);
        } catch (error) {
            console.error("Error loading earlier messages:", error);
            socket.emit('error', { message: "Error loading earlier messages." });
        }
    });

    // Other event listeners can go here...



    socket.on('new-user-joined', async (name) => {
        socket.broadcast.emit('user-joined', name);
    });



    socket.on('send', async (message) => {
        try {
            const newMessage = new Message({
                username: message.savedUsername,
                message: message.message
            });

            await newMessage.save(); // This will include the timestamp automatically
            // console.log('Message stored:', newMessage);

            // Broadcast the stored message to all other clients
            io.emit('receive', {

                id: newMessage._id,      // Using the new message ID
                username: newMessage.username, // Original username
                message: newMessage.message,    // Original message
                timestamp: newMessage.timestamp  // Timestamp from the new message
                // You can add expirationTime if needed, else remove it
            });
        } catch (error) {
            console.error('Error storing message:', error.message);
        }
    });










    socket.on('temp-message', async (data) => {



        const { username, message, timer } = data;
        const expirationTime = new Date(Date.now() + timer); // Set expiration time to 30 seconds later
        const newMessage = new TempMessage({
            username: username,
            message: message,
            expirationTime: expirationTime
        });


        console.log(data);

        try {
            const savedMessage = await newMessage.save(); // Save message using async/await
            // Emit the message to all clients
            io.emit('temp-message-received', { id: savedMessage._id, username, message, expirationTime });
            // Set a timer to delete the message after 30 seconds
            setTimeout(async () => {
                try {
                    await TempMessage.findByIdAndDelete(savedMessage._id); // Delete the message after 30 seconds
                    io.emit('temp-message-deleted', savedMessage._id); // Notify clients about the deletion
                } catch (err) {
                    console.error("Error deleting message:", err);
                }
            }, timer);
        } catch (err) {
            console.error("Error storing message:", err);
        }
    });





});

















http.listen(8000, () => {
    console.log('Server is running on port 8000');
});
