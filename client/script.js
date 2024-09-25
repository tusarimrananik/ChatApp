const socket = io('http://localhost:8000');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messages');


const name = "Anik";
socket.emit('new-user-joined', name);
messagesContainer.innerHTML = `${name} Joined the chat!`


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
});

socket.on('receive', data => {
    const messageElement = document.createElement('p');
    messageElement.textContent = `${data.name}: ${data.message}`;
    messagesContainer.appendChild(messageElement);
});
