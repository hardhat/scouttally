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

// Helper function to format date
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Helper function to get user's next event
async function getNextUserEvent() {
    if (!state.currentUser) return null;
    
    try {
        const response = await ApiService.getUserEvents();
        const now = new Date();
        
        return response.events
            .filter(event => new Date(event.end_date) >= now)
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];
    } catch (error) {
        console.error('Error fetching user events:', error);
        return null;
    }
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
async function showHomePage() {
    // Show loading state first
    mainContent.innerHTML = `
        <div class="jumbotron mb-4">
            <h1><i class="bi bi-trophy-fill text-warning me-3"></i>Welcome to EventScore</h1>
            <p class="lead"><i class="bi bi-calendar-check me-2"></i>Create and manage multi-day events with scored activities</p>
            <div id="home-content">
                ${!state.currentUser ? 
                    `<button class="btn btn-primary btn-lg" id="get-started">
                        <i class="bi bi-rocket-takeoff me-2"></i>Get Started
                    </button>` :
                    `<div class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>`
                }
            </div>
        </div>
    `;

    if (!state.currentUser) {
        document.getElementById('get-started').addEventListener('click', () => {
            window.showRegistrationForm();
        });
        return;
    }

    try {
        const nextEvent = await getNextUserEvent();
        const homeContent = document.getElementById('home-content');

        homeContent.innerHTML = `
            <div class="row mt-4">
                <div class="col-12">
                    ${nextEvent ? `
                        <div class="card">
                            <div class="card-header bg-primary text-white">
                                <h3 class="card-title mb-0">
                                    <i class="bi bi-calendar-event me-2"></i>Your Next Event
                                </h3>
                            </div>
                            <div class="card-body">
                                <h4 class="card-title">${nextEvent.name}</h4>
                                <p class="card-text">
                                    <i class="bi bi-calendar-range me-2"></i>
                                    ${formatDate(nextEvent.start_date)} - ${formatDate(nextEvent.end_date)}
                                </p>
                                <p class="card-text">
                                    <i class="bi bi-person-badge me-2"></i>
                                    ${nextEvent.is_creator ? 
                                        '<span class="badge bg-success me-2">Event Creator</span>' : ''}
                                    ${nextEvent.is_leader ? 
                                        '<span class="badge bg-info">Activity Leader</span>' : ''}
                                </p>
                                <div class="mt-3">
                                    <button class="btn btn-primary me-2" onclick="window.showEventsPage('${nextEvent.id}')">
                                        <i class="bi bi-eye me-2"></i>View Event
                                    </button>
                                    <button class="btn btn-success" id="create-event">
                                        <i class="bi bi-plus-circle me-2"></i>Create New Event
                                    </button>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="text-center">
                            <p class="lead">You don't have any upcoming events.</p>
                            <button class="btn btn-success btn-lg" id="create-event">
                                <i class="bi bi-plus-circle me-2"></i>Create New Event
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `;

        // Add event listener for create event button
        document.getElementById('create-event')?.addEventListener('click', () => {
            if (typeof window.showCreateEventForm === 'function') {
                window.showCreateEventForm();
            }
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        const homeContent = document.getElementById('home-content');
        homeContent.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Error loading your events. Please try again later.
            </div>
            <button class="btn btn-success" id="create-event">
                <i class="bi bi-plus-circle me-2"></i>Create New Event
            </button>
        `;
    }
}

// showCreateEventForm is now implemented in events.js

// More functions would be implemented here...

// Start the app when everything is fully loaded (including all scripts)
window.addEventListener('load', init);