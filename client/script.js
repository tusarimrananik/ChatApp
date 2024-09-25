
const socket = io('http://localhost:8000');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messages');
const wrapper = document.querySelector('.chat');
const name = "Anik";
socket.emit('new-user-joined', name);
messagesContainer.innerHTML = `${name} Joined the chat!`
socket.emit('request-all-messages');


function displayMessages(messages) {
    messages.forEach(message => {
        const messageElement = document.createElement('p');
        messageElement.textContent = `${name}: ${message.text}`;
        messagesContainer.appendChild(messageElement);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function displayEarlierMessage(messages) {
    messages.forEach(message => {
        const messageElement = document.createElement('p');
        messageElement.textContent = `${message.name}: ${message.text}`;
        const firstChild = messagesContainer.firstChild;
        messagesContainer.insertBefore(messageElement, firstChild);
    })


}





let loading = false;
let earliestMessageTimestamp;

socket.on('loadMessages', (messages) => {
    if (messages.length > 0) {
        earliestMessageTimestamp = messages[0].timestamp;
    }
    displayMessages(messages)
});






messagesContainer.addEventListener('scroll', function () {
    // Check if we're at or near the top and if we're not already loading
    if (messagesContainer.scrollTop <= 50 && !loading) {
        console.log("Fetching earlier messages...");
        loading = true; // Set loading state to true

        // Emit the event to load earlier messages, passing the timestamp of the earliest message
        socket.emit('loadEarlierMessages', earliestMessageTimestamp);
    }
});



// Listen for earlier messages from the server
socket.on('displayEarlierMessages', (messages) => {
    if (messages.length > 0) {
        // Update the earliestMessageTimestamp with the timestamp of the first message
        earliestMessageTimestamp = messages[0].timestamp;

        // Save the current scroll position and height before adding new messages
        const oldScrollHeight = messagesContainer.scrollHeight;
        const oldScrollTop = messagesContainer.scrollTop;

        // Prepend the new messages to the chat container
        displayEarlierMessage(messages.reverse()); // Function to add messages at the top

        // Adjust the scroll position after prepending new messages
        const newScrollHeight = messagesContainer.scrollHeight;
        messagesContainer.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
    } else {
        console.log("No more earlier messages to load.");
    }

    loading = false; // Reset loading state
});















socket.on('user-joined', data => {
    messagesContainer.innerHTML = `${data} Joined the chat!`
})
messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendButton.click();
    }
});
sendButton.addEventListener('click', () => {
    let message = messageInput.value;
    socket.emit('send', message);
    const messageElement = document.createElement('p');
    messageElement.textContent = `${name}: ${message}`;
    messagesContainer.appendChild(messageElement);
    messageInput.value = "";
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});
socket.on('receive', data => {
    const messageElement = document.createElement('p');
    messageElement.textContent = `${data.name}: ${data.message}`;
    messagesContainer.appendChild(messageElement);
});
