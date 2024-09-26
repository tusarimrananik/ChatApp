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
let timer = 10000;
let disappearingMessage = false;
let loading = false;
let olderMessagTimestamp;
let notificationQueue = []; // Queue to hold notifications
let notificationCount = 0; // Counter to keep track of stacked notifications

if (savedIsDissaparing === "ON") {
    themeToggleDissaparing.checked = true;
    disappearingMessage = true;
}

if (timerDissapar) {
    timerDissaparing.value = timerDissapar;
    timer = parseInt(timerDissapar) * 1000;


}

timerDissaparing.addEventListener('change', () => {
    let newTimer = timerDissaparing.value;
    localStorage.setItem("timeDissaparing", newTimer);
    timer = parseInt(newTimer) * 1000;

})

themeToggleDissaparing.addEventListener('change', () => {
    if (themeToggleDissaparing.checked) {
        localStorage.setItem('isDissaparing', 'ON');
        showNotification("Message dissapering Turned On!", 3000);
        disappearingMessage = true;

    } else {
        localStorage.setItem('isDissaparing', 'OFF');
        showNotification("Message dissapering Turned OFF!", 3000);
        disappearingMessage = false;
    }
})

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
        localStorage.removeItem("username"); gout
        window.location.reload();
    }
    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    }
}

function sendMessage(messages) {
    const messagesContainer = document.getElementById('messages'); // Access the messages container
    // Check if messages is an array, if not, make it an array
    if (!Array.isArray(messages)) {
        messages = [messages]; // Wrap the single message object in an array
    }

    // Process each message in the array
    messages.forEach((data) => {
        const { id, username, message, expirationTime } = data;
        const isTemporary = expirationTime != null;  // Determine if the message is temporary


        // Create a message element
        const messageElement = document.createElement('div');
        messageElement.id = id || `message-${Date.now()}`; // Assign an ID or use a fallback
        messageElement.classList.add('message');
        messageElement.innerHTML = `<strong>${username}:</strong> ${message}`;

        // Add the countdown span only for temporary messages
        if (isTemporary) {
            messageElement.innerHTML += ` <span class="countdown" id="countdown-${id}"></span>`;
        }

        // Append the new message to the messages container
        messagesContainer.appendChild(messageElement);

        // Always scroll to the bottom after adding a new message
        scrollToBottom(messagesContainer);

        // Handle countdown logic for temporary messages
        if (isTemporary && expirationTime) {
            // Calculate remaining time in seconds
            const remainingTime = Math.floor((new Date(expirationTime) - Date.now()) / 1000);
            let timeLeft = remainingTime;

            const countdownElement = document.getElementById(`countdown-${id}`);
            countdownElement.textContent = ` (${timeLeft}s)`; // Initial timer display

            // Update the countdown timer every second
            const countdownInterval = setInterval(() => {
                timeLeft--;
                countdownElement.textContent = ` (${timeLeft}s)`;

                // If time is up, remove the message and clear the interval
                if (timeLeft <= 0) {
                    clearInterval(countdownInterval);
                    messageElement.remove();
                    scrollToBottom(messagesContainer);  // Scroll after message removal
                }
            }, 1000); // Update every second
        }
    });
}


// Helper function to scroll to the bottom
function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
}


function loadOlderRecentMessage(messages) {
    const messagesContainer = document.getElementById('messages'); // Access the messages container

    if (messages.length > 0) {
        // Update the timestamp for the earliest message
        olderMessagTimestamp = messages[0].timestamp;

        // Append the earlier messages in reverse order at the top
        messages.reverse().forEach((data) => {
            const { id, username, message, expirationTime } = data;
            const isTemporary = expirationTime != null;  // Determine if the message is temporary

            // Create a message element
            const messageElement = document.createElement('div');
            messageElement.id = id || `message-${Date.now()}`; // Assign an ID or use a fallback
            messageElement.classList.add('message');
            messageElement.innerHTML = `<strong>${username}:</strong> ${message}`;

            // Add the countdown span only for temporary messages
            if (isTemporary) {
                messageElement.innerHTML += ` <span class="countdown" id="countdown-${id}"></span>`;
            }

            // Insert the earlier message at the top of the messages container
            messagesContainer.insertBefore(messageElement, messagesContainer.firstChild);

            // Handle countdown logic for temporary messages
            if (isTemporary && expirationTime) {
                const remainingTime = Math.floor((new Date(expirationTime) - Date.now()) / 1000);
                let timeLeft = remainingTime;

                const countdownElement = document.getElementById(`countdown-${id}`);
                countdownElement.textContent = ` (${timeLeft}s)`; // Initial timer display

                // Update the countdown timer every second
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
        });
    } else {
        console.log("No more earlier messages to load.");
    }

    loading = false; // Set the loading flag to false after loading
}





socket.on('displayRecentMessages', (messages) => {
    if (messages.length > 0) {
        olderMessagTimestamp = messages[0].timestamp;
    }
    loadOlderRecentMessage(messages)
});



messagesContainer.addEventListener('scroll', function () {
    if (messagesContainer.scrollTop <= 50 && !loading) {
        console.log("Fetching earlier messages...");
        loading = true;
        socket.emit('loadOlderMessage', olderMessagTimestamp);
    }
});




socket.on('displayOlderMessages', (messages) => {
    if (messages.length > 0) {
        olderMessagTimestamp = messages[0].timestamp;
        loadOlderRecentMessage(messages);
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


socket.on('receive', sendMessage);

socket.on('temp-message-received', sendMessage);

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
        messageInput.value = "";
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    }
});


















//SHOW NOTIFICAITON 

function showNotification(info, duration = 3000) {
    const notification = document.createElement('div'); // Create a new notification element
    notification.classList.add('notification'); // Add notification class
    notification.innerText = info; // Set the notification text
    // Calculate the top position based on the current count of notifications
    const verticalOffset = 10 + (notificationCount * 30); // 70px for each notification's height + margin
    notification.style.top = `${verticalOffset}px`; // Apply the top offset
    document.body.appendChild(notification); // Append it to the body
    notificationCount++; // Increment the count of notifications
    // Show the notification with a slight delay for stacking effect
    setTimeout(() => {
        notification.classList.add('show'); // Show the notification
        notification.style.display = 'block'; // Ensure it's set to block when showing
    }, 0); // Trigger the display in the next event loop
    // Automatically hide after the specified duration
    setTimeout(() => {
        slideOut(notification); // Call slide out function
    }, duration);
}

function slideOut(notification) {
    notification.style.animation = 'slideOut 0.5s forwards'; // Set the slide-out animation
    notification.style.opacity = '0'; // Fade out the opacity

    // Remove the notification after the animation completes
    setTimeout(() => {
        notification.remove(); // Remove the notification from the DOM
        notificationCount--; // Decrease the count of notifications
        adjustNotificationPositions(); // Adjust positions of remaining notifications
    }, 500); // Duration should match the animation duration
}

// Adjust positions of notifications after one is removed
function adjustNotificationPositions() {
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach((notification, index) => {
        const newOffset = 20 + (index * 30); // Recalculate top position for each remaining notification
        notification.style.top = `${newOffset}px`;
    });
}


//SHOW NOTIFICAITON 
