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





const fetchRecentMessages = async (limit = 20) => {
    try {
        // Fetch regular messages
        const regularMessages = await Message.find().sort({ timestamp: -1 }).limit(limit);

        // Fetch temporary messages with expiration time
        const tempMessages = await TempMessage.find({ expirationTime: { $gte: new Date() } }) // Only fetch unexpired messages
            .sort({ timestamp: -1 })
            .limit(limit);

        // Merge and sort by timestamp (most recent first)
        const allMessages = [...regularMessages, ...tempMessages].sort((a, b) => b.timestamp - a.timestamp);

        // Optionally, limit the total number of messages after merging
        return allMessages.slice(0, limit);
    } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
    }
};














// const fetchRecentMessages = async (limit = 20) => {
//     return await Message.find().sort({ timestamp: -1 }).limit(limit);
// };



const fetchEarlierMessages = async (timestamp, limit = 20) => {
    return await Message.find({ timestamp: { $lt: timestamp } })
        .sort({ timestamp: -1 })
        .limit(limit);
};






io.on('connection', (socket) => {
    fetchRecentMessages().then(messages => {
        socket.emit('loadMessages', messages.reverse());
    });





    socket.on('loadEarlierMessages', (timestamp) => {
        fetchEarlierMessages(timestamp).then(messages => {
            socket.emit('displayEarlierMessages', messages.reverse());
        });
    });










    socket.on('new-user-joined', async (name) => {

        socket.broadcast.emit('user-joined', name);
    });


    socket.on('send', async (message) => {
        socket.broadcast.emit('receive', { message: message.message, name: message.savedUsername });
        try {
            const newMessage = new Message({
                username: message.savedUsername,
                text: message.message
            });
            await newMessage.save();
            console.log('Message stored:', newMessage);
        } catch (error) {
            console.error('Error storing message:', error.message);
        }
    });




    // socket.on('temp-message', (data) => {
    //     const { username, message, time } = data;
    //     const expirationTime = new Date(Date.now() + time); // Set expiration time to 30 seconds later
    //     const newMessage = new TempMessage({
    //         username: username,
    //         message: message,
    //         expirationTime: expirationTime
    //     });

    //     newMessage.save((err, savedMessage) => {
    //         if (err) {
    //             console.error("Error storing message:", err);
    //         } else {
    //             // Emit the temp message to all clients
    //             io.emit('temp-message-received', { id: savedMessage._id, username, message, expirationTime });

    //             // Set a timer to delete the message after 30 seconds
    //             setTimeout(() => {
    //                 TempMessage.findByIdAndDelete(savedMessage._id, (err) => {
    //                     if (!err) {
    //                         io.emit('temp-message-deleted', savedMessage._id); // Notify clients about the deletion
    //                     }
    //                 });
    //             }, 30000); // 30 seconds delay
    //         }
    //     });
    // });


    socket.on('temp-message', async (data) => {
        console.log('working!')
        const { username, message, timer } = data;
        console.log("Username:", username, "Message:", message);

        const expirationTime = new Date(Date.now() + timer); // Set expiration time to 30 seconds later

        const newMessage = new TempMessage({
            username: username,
            message: message,
            expirationTime: expirationTime
        });

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
            }, 30000);
        } catch (err) {
            console.error("Error storing message:", err);
        }
    });



























});















setInterval(async () => {
    try {
        const now = new Date();
        await TempMessage.deleteMany({ expirationTime: { $lte: now } }); // Delete expired messages
        console.log("Expired messages cleaned up");
    } catch (err) {
        console.error("Error cleaning up expired messages:", err);
    }
}, 60000); // Run every minute






















http.listen(8000, () => {
    console.log('Server is running on port 8000');
});
