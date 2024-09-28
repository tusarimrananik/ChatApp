const socket = io('http://localhost:8000');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messages');
const wrapper = document.querySelector('.chat');
const joinBtn = document.getElementById("joinBtn");
const usernameInput = document.getElementById("username");
const errorMessage = document.getElementById("error-message");
const usernameDisplay = document.getElementById("usernameDisplay");
const userInfo = document.getElementById("userInfo");
const logoutButton = document.getElementById("logoutButton");
// Check if name exists in localStorage
const savedName = localStorage.getItem('name');
const usernameElement = document.getElementById('username');
const modal = document.getElementById('nameModal');
const nameInput = document.getElementById('nameInput');
const error = document.getElementById('error');
let ghostTimer = 10; // Declare the ghostTimer variable
let loading = false;
let olderMessagTimestamp;
let notificationQueue = []; // Queue to hold notifications
let notificationCount = 0; // Counter to keep track of stacked notifications
let ghostMode = false; // Initialize it

if (savedName) {
    // Display the saved name in the #username element
    usernameElement.innerText = savedName;
    socket.emit('new-user-joined', savedName);

} else {
    // Show the modal if name is not present
    modal.style.display = 'block';
}


nameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && document.activeElement === nameInput) {
        document.getElementById('submitName').click();
    }
});




// Event listener for the "Join Chat" button
document.getElementById('submitName').addEventListener('click', () => {
    const nameValue = nameInput.value.trim();

    if (nameValue === '') {
        // Show error if the input is empty
        error.style.display = 'block';
    } else {
        // Hide error, save the name in localStorage, and reload the page
        error.style.display = 'none';
        localStorage.setItem('name', nameValue);
        location.reload();
    }
});








let typingTimeout; // To hold the timeout for stopping typing
let isTyping = false; // To keep track of whether the user is currently typing
let typingUsers = new Set(); // Use a Set to track unique users typing




// Emit a typing event when the user types
messageInput.addEventListener('input', () => {
    // Emit the typing event only if the user was not already typing

    if (!isTyping) {
        socket.emit('typing', savedName);
        isTyping = true; // Set typing status to true
    }

    // Clear any existing timeout to reset the delay
    clearTimeout(typingTimeout);

    // Set a new timeout to emit stopTyping after 1 second of inactivity
    typingTimeout = setTimeout(() => {
        socket.emit('stopTyping', savedName); // Emit stopTyping event to the server
        isTyping = false; // Set typing status to false
    }, 1000); // Adjust the time as necessary
});




// Listen for typing event from server
socket.on('userTyping', (savedName) => {

    typingUsers.add(savedName); // Add user to the set of typing users
    updateTypingIndicator(); // Update the typing indicator message



});

// Listen for stop typing event from server
socket.on('userStoppedTyping', (savedName) => {
    typingUsers.delete(savedName); // Remove user from the set of typing users
    updateTypingIndicator(); // Update the typing indicator message


});

function updateTypingIndicator() {
    const typingMessageContainer = document.getElementById('typing-message'); // Reference to the typing message container
    typingMessageContainer.innerHTML = ''; // Clear previous content

    if (typingUsers.size > 0) {
        let typingMessage = '';
        const userArray = Array.from(typingUsers);

        // Format the message for displaying typing users
        if (userArray.length === 1) {
            typingMessage = `${userArray[0]} is typing...`;
        } else if (userArray.length === 2) {
            typingMessage = `${userArray[0]} and ${userArray[1]} are typing...`;
        } else {
            const othersCount = userArray.length - 2;
            typingMessage = `${userArray[0]}, ${userArray[1]} and ${othersCount} others are typing...`;
        }

        // Create a new typing indicator element
        const newIndicator = document.createElement('div');
        newIndicator.classList.add('typing-bubble'); // Add your existing class for styling

        // Create a container for the typing dots
        const dotsContainer = document.createElement('div');
        dotsContainer.classList.add('typing-dots');

        // Create the 3 typing dots
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.classList.add('typing-dot');
            dotsContainer.appendChild(dot);
        }

        // Create a span for the message
        const messageSpan = document.createElement('span');
        messageSpan.textContent = typingMessage;

        // Append the dots container before the message span
        newIndicator.appendChild(dotsContainer);
        newIndicator.appendChild(messageSpan);

        // Append the new typing indicator to the typing message container
        typingMessageContainer.appendChild(newIndicator);

        // Optionally scroll to the bottom of the messages container
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else {
        typingMessageContainer.innerHTML = ''; // Clear previous content
    }
}






//SEND AND RECEIEVE MESSAGES===========================
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

function loadOlderRecentMessage(messages, callback) {
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
                countdownElement.textContent = `${timeLeft}s`; // Initial timer display

                // Update the countdown timer every second
                const countdownInterval = setInterval(() => {
                    timeLeft--;
                    countdownElement.textContent = ` ${timeLeft}s`;

                    // If time is up, remove the message and clear the interval
                    if (timeLeft <= 0) {
                        clearInterval(countdownInterval);
                        messageElement.remove();
                    }
                }, 1000); // Update every second
            }
        });
    } else {
    }

    loading = false; // Set the loading flag to false after loading
    hideLoadingOverlay(); // Hide loading overlay

    messagesContainer.scrollTop = 200; // Adjust this value as needed
    if (callback) {
        callback();
    }

}

// Helper function to scroll to the bottom
function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
}



socket.on('user-joined', user => {
    showNotification(`${user} joined the chat!`)
})





socket.on('displayRecentMessages', (messages) => {
    if (messages.length > 0) {
        olderMessagTimestamp = messages[0].timestamp;
    }
    loadOlderRecentMessage(messages, () => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    })
});

socket.on('displayOlderMessages', (messages) => {
    if (messages.length > 0) {
        olderMessagTimestamp = messages[0].timestamp;
        loadOlderRecentMessage(messages);
    } else {
        hideLoadingOverlay(); // Hide loading overlay
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




// Detect attempts to scroll (mouse wheel or touchpad)
messagesContainer.addEventListener('wheel', function (event) {
    // Check if the user is trying to scroll up
    if (event.deltaY < 0 && messagesContainer.scrollTop <= 70 && !loading) {

        loading = true; // Prevent multiple requests
        showLoadingOverlay(); // Show loading overlay
        socket.emit('loadOlderMessage', olderMessagTimestamp);

    }
});


// Detect touch attempts to scroll (touchscreen devices)
messagesContainer.addEventListener('touchmove', function (event) {
    // Check if the user is trying to scroll up while at the top
    if (messagesContainer.scrollTop <= 70 && !loading) {
        const touch = event.touches[0]; // Get the first touch point
        const touchMovement = touch.clientY; // Get the Y coordinate of the touch

        // If the user is trying to scroll up (Y coordinate is decreasing)
        if (touchMovement < messagesContainer.clientHeight / 2) {

            loading = true; // Prevent multiple requests
            // showLoadingOverlay(); // Show loading overlay
            socket.emit('loadOlderMessage', olderMessagTimestamp);
        }
    }
});






// Show the loading overlay
function showLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex'; // Use flex to center the content
}

// Hide the loading overlay
function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'none';
}













































sendButton.addEventListener('click', () => {
    let message = messageInput.value;
    if (message === "") return;


    // Stop typing indicator since the user has sent the message
    clearTimeout(typingTimeout); // Clear any existing timeout
    socket.emit('stopTyping', savedName); // Emit stopTyping event to the server
    isTyping = false; // Set typing status to false


    if (ghostMode) {
        socket.emit('temp-message', { username: savedName, message, ghostTimer });
        messageInput.value = "";
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else {
        socket.emit('send', { message, savedName });
        messageInput.value = "";
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    }
});


messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendButton.click();
    }
});



















function showNotification(info, duration = 3000) {
    const notification = document.createElement('div'); // Create a new notification element
    notification.classList.add('notification'); // Add notification class
    notification.innerText = info; // Set the notification text

    // Calculate the bottom position based on the current count of notifications
    const verticalOffset = 100 + (notificationCount * 50); // 70px for each notification's height + margin
    notification.style.bottom = `${verticalOffset}px`; // Apply the bottom offset
    document.body.appendChild(notification); // Append it to the body
    notificationCount++; // Increment the count of notifications

    // Trigger the slide-in effect
    setTimeout(() => {
        notification.classList.add('show'); // Show the notification (slide in from right)
    }, 0); // Trigger the display in the next event loop

    // Automatically hide after the specified duration
    setTimeout(() => {
        slideOut(notification); // Call slide out function
    }, duration);
}

function slideOut(notification) {
    notification.classList.remove('show'); // Remove the show class to trigger slide-out
    notification.classList.add('slide-out'); // Add the slide-out class for animation
    notification.style.right = '-300px'; // Optionally set right to -300px for off-screen

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
        const newOffset = 50 + (index * 70); // Recalculate bottom position for each remaining notification
        notification.style.bottom = `${newOffset}px`;
    });
}





















































//Dom manupulation

document.getElementById('openPopup').addEventListener('click', function () {
    document.getElementById('overlay').style.display = 'flex'; // Show the popup
});

document.getElementById('closeBtn').addEventListener('click', function () {
    document.getElementById('overlay').style.display = 'none'; // Hide the popup
});




// document.getElementById('submitBtn').addEventListener('click', function () {
//     const time = document.getElementById('ghostModeTime').value;
//     if (!time) {
//         console.log("no time")
//         showNotification(`No value set, applying default of 10 seconds`)
//         document.getElementById('overlay').style.display = 'none'; // Hide the popup after submission
//     } else {
//         showNotification(`Disappears In: ${time} sec`)
//         document.getElementById('overlay').style.display = 'none'; // Hide the popup after submission
//         console.log("time")
//     }
// });



// document.getElementById('submitBtn').addEventListener('click', function () {
//     const timeInput = document.getElementById('ghostModeTime').value;
//     let time = timeInput ? timeInput : 10; // Set default to 10 if no value provided

//     if (!timeInput) {
//         console.log("No time set, using default of 10 seconds");
//         showNotification(`No value set, applying default of 10 seconds`);
//     } else {
//         console.log(`Time set to: ${time} seconds`);
//         showNotification(`Disappears In: ${time} sec`);
//     }

//     document.getElementById('overlay').style.display = 'none'; // Hide the popup after submission
// });


// document.getElementById('ghostModeTime').addEventListener('keydown', (event) => {
//     if (event.key === 'Enter') {
//         // Trigger the change event to handle the submission logic
//         const changeEvent = new Event('change');
//         document.getElementById('ghostModeTime').dispatchEvent(changeEvent);
//         document.getElementById('submitName').click();
//         console.log('Ghost Mode Time submitted...');
//     }
// });


// document.getElementById('ghostModeTime').addEventListener('change', function () {
//     const timeInput = document.getElementById('ghostModeTime').value;
//     let time;

//     // Validate the input value
//     if (timeInput && !isNaN(timeInput) && parseInt(timeInput) > 0) {
//         time = parseInt(timeInput);
//     } else {
//         console.log("Invalid time input, using default of 10 seconds.");
//         time = 10; // Default value
//     }

//     // Store the valid value in localStorage
//     localStorage.setItem('ghostModeTime', time);

//     // Update the ghostTimer variable
//     ghostTimer = time;

//     // Hide the popup after submission
//     document.getElementById('overlay').style.display = 'none';
// });








document.getElementById('submitBtn').addEventListener('click', function () {
    handleTimeSubmission();
});

document.getElementById('ghostModeTime').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleTimeSubmission();
    }
});

function handleTimeSubmission() {
    const timeInput = document.getElementById('ghostModeTime').value;
    let time = timeInput ? parseInt(timeInput) : 10; // Default to 10 if no value provided

    // Validate the input value
    if (!timeInput || isNaN(time) || time < 1 || time > 10000) {
        console.log("Invalid time input, using default of 10 seconds.");
        time = 10; // Default value
        showNotification(`No valid value set, applying default of 10 seconds`);
    } else {
        console.log(`Time set to: ${time} seconds`);
        showNotification(`Disappears Timer Set To: ${time} sec`);
    }

    // Store the valid value in localStorage
    localStorage.setItem('ghostModeTime', time);

    // Update the ghostTimer variable
    ghostTimer = time;

    // Hide the popup after submission
    document.getElementById('overlay').style.display = 'none';
}




























// document.getElementById('ghostModeTime').addEventListener('keydown', (event) => {
//     if (event.key === 'Enter' && document.activeElement === nameInput) {
//         document.getElementById('submitName').click();
//         console.log('working...')

//     }
// });






// document.getElementById('ghostModeTime').addEventListener('change', function () {
//     const time = document.getElementById('ghostModeTime').value;

//     // Store the value in localStorage
//     localStorage.setItem('ghostModeTime', time);

//     // Update the ghostTimer variable
//     ghostTimer = parseInt(time);


//     // Hide the popup after submission
//     document.getElementById('overlay').style.display = 'none';
// });
































// Optional: Load the value from localStorage when the page loads
window.onload = function () {
    // Load the ghost mode state from localStorage
    ghostMode = localStorage.getItem('ghostMode') === 'true';

    // Load the ghost mode time from localStorage
    const storedTime = localStorage.getItem('ghostModeTime');

    // Set the ghost mode checkbox based on the stored state
    document.getElementById('ghostMode').checked = ghostMode;

    // If there is a stored time, set it in the input field and initialize ghostTimer
    if (storedTime) {
        document.getElementById('ghostModeTime').value = storedTime; // Set the input value
        ghostTimer = storedTime; // Initialize ghostTimer with the stored value
    }

    // Update the inner text of the ghostMode button
    updateGhostModeButtonText(); // Call function to update button text
};

// Function to update the ghost mode button text based on its state
function updateGhostModeButtonText() {
    document.getElementById('ghostMode').innerHTML = ghostMode ? `<img src="img/alarm.png" alt="SVG Example" style="width: 25px; height: 25px;">` : `<img src="img/alaram.png" alt="SVG Example" style="width: 25px; height: 25px;">`;
}

// Event listener for toggling ghost mode
document.getElementById('ghostMode').addEventListener('click', () => {
    // Toggle the ghost mode state
    ghostMode = !ghostMode;

    // Set the new state in localStorage
    localStorage.setItem('ghostMode', ghostMode);

    // Notify the user using an alert
    showNotification(ghostMode ? 'Disappearing messages enabled!' : 'Disappearing messages disabled!');

    // Update the UI based on the new state
    updateGhostModeButtonText(); // Call function to update button text
});



// Event listener for clearing session and reloading the page
document.getElementById('sessionClear').addEventListener('click', () => {
    // Clear all data from localStorage
    localStorage.clear();
    showNotification("You've been Logged Out!", 3000)

    // Reload the page
    location.reload();
});



