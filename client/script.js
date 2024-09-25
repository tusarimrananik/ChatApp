
const socket = io('http://localhost:8000');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messages');
const wrapper = document.querySelector('.chat');
let savedUsername = localStorage.getItem("username");





window.onload = function () {
    const modal = document.getElementById("nameModal");
    const joinBtn = document.getElementById("joinBtn");
    const usernameInput = document.getElementById("username");
    const errorMessage = document.getElementById("error-message");

    // Check if username is already in local storage
    if (savedUsername) {
        console.log(`Welcome back, ${savedUsername}!`); // Welcome back if username exists
    } else {
        modal.style.display = "block"; // Show the modal when the page loads
    }

    joinBtn.onclick = function () {
        const username = usernameInput.value.trim();
        if (username) {
            localStorage.setItem("username", username); // Save username to local storage
            modal.style.display = "none"; // Close the modal
            // You can also add logic here to proceed to the chat room

            savedUsername = localStorage.getItem("username");
        } else {
            errorMessage.textContent = "Please enter your username."; // Set the error message
            errorMessage.style.display = "block"; // Show the error message
        }
    }

    // Optional: close modal if clicked outside (you can remove this if not needed)
    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = "none"; // Close modal if clicked outside
        }
    }
}



// if (!savedUsername) {
//     socket.emit('new-user-joined', savedUsername);
// }

















console.log(`${savedUsername} Joined the chat!`)


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
    socket.emit('send', { message, savedUsername });
    const messageElement = document.createElement('p');
    messageElement.textContent = `${savedUsername}: ${message}`;
    messagesContainer.appendChild(messageElement);
    messageInput.value = "";
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});
socket.on('receive', data => {
    const messageElement = document.createElement('p');
    messageElement.textContent = `${data.name}: ${data.message}`;
    messagesContainer.appendChild(messageElement);
});









