
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
    if (this.scrollTop === 0 && !loading) {
        console.log("working")
        loading = true;
        socket.emit('loadEarlierMessages', earliestMessageTimestamp);
    }
});






socket.on('displayEarlierMessages', (messages) => {
    if (messages.length > 0) {
        earliestMessageTimestamp = messages[0].timestamp;

        console.log(messages)


        displayEarlierMessage(messages)
        // displayMessages(messages);
        // console.log("sdfsd")
        loading = false;
    }
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
