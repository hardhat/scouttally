// App state
const state = {
    currentUser: null,
    events: [],
    teams: [],
    activities: []
};

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

    // Load initial data (don't wait for it to complete)
    fetchEvents().catch(error => {
        console.error('Error loading initial events:', error);
    });
    showHomePage();
}

// Update navigation based on login status
function updateNavigation(isLoggedIn) {
    const loginLink = document.getElementById('nav-login');
    const registerLink = document.getElementById('nav-register');

    // Remove existing event listeners by cloning the element
    const newLoginLink = loginLink.cloneNode(true);
    loginLink.parentNode.replaceChild(newLoginLink, loginLink);

    if (isLoggedIn) {
        newLoginLink.innerHTML = '<i class="bi bi-box-arrow-right me-1"></i>Logout';
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