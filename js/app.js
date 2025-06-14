// App state
const state = {
    currentUser: null,
    events: [],
    teams: [],
    activities: []
};

// Avatar color palette - using a set of pleasant, distinct colors
const avatarColors = [
    '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#E91E63',
    '#00BCD4', '#673AB7', '#FF5722', '#3F51B5', '#009688'
];

// Helper function to get initials from name
function getInitials(name) {
    return name.split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Helper function to get avatar color based on user ID
function getAvatarColor(userId) {
    return avatarColors[userId % avatarColors.length];
}

// DOM elements
const mainContent = document.getElementById('main-content');

// Initialize app
function init() {
    console.log('Initializing app...');
    console.log('window.showEventsPage available:', typeof window.showEventsPage);
    console.log('window.showRankingsPage available:', typeof window.showRankingsPage);
    console.log('window.showLoginForm available:', typeof window.showLoginForm);
    console.log('window.showRegistrationForm available:', typeof window.showRegistrationForm);

    // Set up navigation handlers with safety checks
    document.getElementById('nav-home').addEventListener('click', (e) => {
        e.preventDefault();
        showHomePage();
    });

    document.getElementById('nav-events').addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.showEventsPage === 'function') {
            window.showEventsPage();
        } else {
            console.error('showEventsPage function not found');
        }
    });

    document.getElementById('nav-rankings').addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.showRankingsPage === 'function') {
            window.showRankingsPage();
        } else {
            console.error('showRankingsPage function not found');
        }
    });

    document.getElementById('nav-login').addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.showLoginForm === 'function') {
            window.showLoginForm();
        } else {
            console.error('showLoginForm function not found');
        }
    });

    document.getElementById('nav-register').addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.showRegistrationForm === 'function') {
            window.showRegistrationForm();
        } else {
            console.error('showRegistrationForm function not found');
        }
    });
    // Check if user is logged in
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        state.currentUser = JSON.parse(savedUser);
        updateNavigation(true);
    } else {
        updateNavigation(false);
    }

    // Only fetch events if user is logged in
    if (state.currentUser) {
        fetchEvents().catch(error => {
            // Only show error if it's not a session expired error
            if (!error.message.includes('Session expired')) {
                console.error('Error loading initial events:', error);
            }
        });
    }
    showHomePage();
}

// Update navigation based on login status
function updateNavigation(isLoggedIn) {
    const loginLink = document.getElementById('nav-login');
    const registerLink = document.getElementById('nav-register');

    // Remove existing event listeners by cloning the element
    const newLoginLink = loginLink.cloneNode(true);
    loginLink.parentNode.replaceChild(newLoginLink, loginLink);

    if (isLoggedIn && state.currentUser) {
        // Create user info with avatar
        const initials = getInitials(state.currentUser.name);
        const avatarColor = getAvatarColor(state.currentUser.id);
        
        newLoginLink.innerHTML = `
            <span class="nav-user-info">
                <span class="user-avatar" style="background-color: ${avatarColor}">
                    ${initials}
                </span>
                <i class="bi bi-box-arrow-right me-1"></i>Logout
            </span>
        `;
        newLoginLink.addEventListener('click', window.logout);
        registerLink.style.display = 'none';
    } else {
        newLoginLink.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>Login';
        newLoginLink.addEventListener('click', window.showLoginForm);
        registerLink.style.display = 'block';
    }
}

// Page rendering functions
function showHomePage() {
    mainContent.innerHTML = `
        <div class="jumbotron">
            <h1><i class="bi bi-trophy-fill text-warning me-3"></i>Welcome to EventScore</h1>
            <p class="lead"><i class="bi bi-calendar-check me-2"></i>Create and manage multi-day events with scored activities</p>
            ${!state.currentUser ?
                `<button class="btn btn-primary btn-lg" id="get-started">
                    <i class="bi bi-rocket-takeoff me-2"></i>Get Started
                </button>` :
                `<button class="btn btn-success btn-lg" id="create-event">
                    <i class="bi bi-plus-circle me-2"></i>Create New Event
                </button>`
            }
        </div>
    `;
    
    if (!state.currentUser) {
        document.getElementById('get-started').addEventListener('click', window.showRegistrationForm);
    } else {
        document.getElementById('create-event').addEventListener('click', window.showCreateEventForm);
    }
}

// showCreateEventForm is now implemented in events.js

// More functions would be implemented here...

// Start the app when everything is fully loaded (including all scripts)
window.addEventListener('load', init);