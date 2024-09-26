const socket = io('http://localhost:8000');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messages');
const wrapper = document.querySelector('.chat');
const modal = document.getElementById("nameModal");
const joinBtn = document.getElementById("joinBtn");
const usernameInput = document.getElementById("username");
const errorMessage = document.getElementById("error-message");
const usernameDisplay = document.getElementById("usernameDisplay");
const userInfo = document.getElementById("userInfo");
const logoutButton = document.getElementById("logoutButton");
const themeToggleDissaparing = document.getElementById("themeToggle");
const timerDissaparing = document.getElementById("timer");
let savedUsername = localStorage.getItem("username");
let savedIsDissaparing = localStorage.getItem("isDissaparing");
let timerDissapar = localStorage.getItem("timeDissaparing");



if (savedIsDissaparing === "ON") {
    themeToggleDissaparing.checked = true;
}


if (timerDissapar) {
    timerDissaparing.value = timerDissapar;
}



timerDissaparing.addEventListener('change', () => {
    let newTimer = timerDissaparing.value;
    localStorage.setItem("timeDissaparing", newTimer);

})





themeToggleDissaparing.addEventListener('change', () => {
    if (themeToggleDissaparing.checked) {
        localStorage.setItem('isDissaparing', 'ON');

        newNotification("message dissapering is on")




    } else {
        localStorage.setItem('isDissaparing', 'OFF');
        newNotification("message dissapering is off")

    }
})



function newNotification(info) {
    document.getElementById('notification').innerText = info;
    showNotification()
    slideOut(document.getElementById('notification'));
}




let disappearingMessage = true;
let timer = 100000;
window.onload = function () {
    if (savedUsername) {
        usernameDisplay.innerText = savedUsername; // Display the saved username
        userInfo.style.display = 'flex'; // Show the user info section
    } else {
        modal.style.display = "block"; // Show the modal when the page loads
    }
    joinBtn.onclick = function () {
        const username = usernameInput.value.trim();
        if (username) {
            localStorage.setItem("username", username); // Save username to local storage

            savedUsername = localStorage.getItem("username");
            modal.style.display = "none"; // Close the modal
            usernameDisplay.innerText = username; // Display the username
            userInfo.style.display = 'flex'; // Show the user info section

            // Emit the new user joined event
            socket.emit('new-user-joined', username);
        } else {
            errorMessage.textContent = "Please enter your username."; // Set the error message
            errorMessage.style.display = "block"; // Show the error message
        }
    }
    usernameDisplay.onclick = function () {
        const isDisplayed = logoutButton.style.display === 'block';
        logoutButton.style.display = isDisplayed ? 'none' : 'block';
    }

    logoutButton.onclick = function () {
        localStorage.removeItem("username"); // Remove username from local storage
        // userInfo.style.display = 'none'; // Hide the user info section
        // usernameInput.value = ''; // Clear username input
        // modal.style.display = 'block'; // Show the modal again
        // logoutButton.style.display = 'none'; // Hide the logout button after logout
        window.location.reload();
    }
    // Optional: close modal if clicked outside (you can remove this if not needed)
    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = "none"; // Close modal if clicked outside
        }
    }
}


function handleTempMessageReceived(data) {
    const { id, username, message, expirationTime } = data;
    console.log(data);
    console.log("woorking")
    console.log(id, username, message, expirationTime);
    // Create a message element
    const messageElement = document.createElement('div');
    messageElement.id = id;
    messageElement.classList.add('message');
    messageElement.innerHTML = `<strong>${username}:</strong> ${message} <span class="countdown" id="countdown-${id}"></span>`;
    document.getElementById('messages').appendChild(messageElement);
    // Calculate remaining time in seconds
    const remainingTime = Math.floor((new Date(expirationTime) - Date.now()) / 1000);
    // Update the countdown timer every second
    let timeLeft = remainingTime;


    ///multiple

    const countdownElement = document.getElementById(`countdown-${id}`);
    countdownElement.textContent = ` (${timeLeft}s)`; // Initial timer display
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    ////here is the problem

    const countdownInterval = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = ` (${timeLeft}s)`;
        // If time is up, remove the message and clear the interval
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            messageElement.remove();
        }
    }, 1000); // Update every second
}





function displayMessages(messages) {
    messages.forEach(message => {
        console.log(message); // Log the message object to check its structure

        // Create a temporary message object with the required properties
        const tempMessage = {
            id: message._id, // Map _id to id
            username: message.username,
            message: message.message, // Map text to message
            expirationTime: message.expirationTime // Set to null if not a temporary message
        };

        if (tempMessage.expirationTime) {
            handleTempMessageReceived(tempMessage);
        } else {
            const messageElement = document.createElement('p');
            messageElement.textContent = `${tempMessage.username}: ${tempMessage.message}`;
            messagesContainer.appendChild(messageElement);
        }
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

    console.log("load message is fired", messages)
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

socket.on('user-joined', user => {
    console.log(`${user} Joined the chat!`)
})



messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendButton.click();
    }
});

socket.on('temp-message-received', handleTempMessageReceived);





socket.on('temp-message-deleted', (messageId) => {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        messageElement.remove();
    }
});













sendButton.addEventListener('click', () => {

    let message = messageInput.value;
    if (message === "") return;


    if (disappearingMessage) {
        socket.emit('temp-message', { username: savedUsername, message, timer });



        messageInput.value = "";
        messagesContainer.scrollTop = messagesContainer.scrollHeight;


    } else {

        socket.emit('send', { message, savedUsername });

        const messageElement = document.createElement('p');
        messageElement.textContent = `${savedUsername}: ${message}`;
        messagesContainer.appendChild(messageElement);
        messageInput.value = "";
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    }



});



























socket.on('receive', data => {
    const messageElement = document.createElement('p');
    messageElement.textContent = `${data.name}: ${data.message}`;
    messagesContainer.appendChild(messageElement);
});













let notificationQueue = []; // Queue to hold notifications

function showNotification(info, duration = 3000) {
    const notification = document.createElement('div'); // Create a new notification element
    notification.classList.add('notification'); // Add notification class
    notification.innerText = info; // Set the notification text
    document.body.appendChild(notification); // Append it to the body

    notification.classList.add('show'); // Show the notification
    notification.style.display = 'block'; // Ensure it's set to block when showing

    // Automatically hide after the specified duration
    setTimeout(() => {
        slideOut(notification); // Call slide out function
    }, duration);
}

function slideOut(notification) {
    notification.style.animation = 'slideOut 0.5s forwards'; // Set the slide out animation
    notification.style.opacity = '0'; // Fade out the opacity

    // Remove the notification after the animation completes
    setTimeout(() => {
        notification.remove(); // Remove the notification from the DOM
    }, 500); // Duration should match the animation duration
}

// Close button functionality
document.querySelector('.close-btn').onclick = function () {
    const notification = document.querySelector('.notification.show'); // Get the currently displayed notification
    if (notification) {
        slideOut(notification); // Close it immediately
    }
};

// Example usage
showNotification("Your first notification!", 3000);
showNotification("Your second notification!", 5000);
showNotification("Your third notification!", 4000);











