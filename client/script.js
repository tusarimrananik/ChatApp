
const socket = io('http://localhost:8000');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messages');
const wrapper = document.querySelector('.chat');
let name = prompt("enter Your Name")
if (name == "") {
    name = "Anonymous Participant"
}
socket.emit('new-user-joined', name);
messagesContainer.innerHTML = `${name} Joined the chat!`
socket.emit('request-all-messages');
function displayMessages(messages) {
    messages.forEach(message => {
        const messageElement = document.createElement('p');
        messageElement.textContent = `${message.username}: ${message.text}`;
        messagesContainer.appendChild(messageElement);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}




function displayEarlierMessage(messages) {
    messages.forEach(message => {
        const messageElement = document.createElement('p');
        messageElement.textContent = `${message.username}: ${message.text}`;
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
    if (messagesContainer.scrollTop <= 50 && !loading) {
        console.log("Fetching earlier messages...");
        loading = true;
        socket.emit('loadEarlierMessages', earliestMessageTimestamp);
    }
});
socket.on('displayEarlierMessages', (messages) => {
    if (messages.length > 0) {
        earliestMessageTimestamp = messages[0].timestamp;

        const oldScrollHeight = messagesContainer.scrollHeight;
        const oldScrollTop = messagesContainer.scrollTop;

        displayEarlierMessage(messages.reverse());
        const newScrollHeight = messagesContainer.scrollHeight;
        messagesContainer.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
    } else {
        console.log("No more earlier messages to load.");
    }
    loading = false;
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
    socket.emit('send', { message, name });
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
