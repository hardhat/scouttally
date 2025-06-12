// Fetch all events
async function fetchEvents() {
    try {
        const response = await ApiService.getEvents();
        state.events = response.events || [];
        return state.events;
    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
    }
}

// Show events page
async function showEventsPage() {
    mainContent.innerHTML = `
        <h2 class="mb-4">Events</h2>
        <div class="row" id="events-container">
            <div class="col-12 text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
        ${state.currentUser ? 
            `<div class="mt-4">
                <button class="btn btn-primary" id="create-event-btn">Create New Event</button>
            </div>` : ''
        }
    `;
    
    if (state.currentUser) {
        document.getElementById('create-event-btn').addEventListener('click', showCreateEventForm);
    }
    
    try {
        const events = await fetchEvents();
        const eventsContainer = document.getElementById('events-container');
        
        if (events.length === 0) {
            eventsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        No events found. ${state.currentUser ? 'Create your first event!' : 'Please login to create events.'}
                    </div>
                </div>
            `;
            return;
        }
        
        eventsContainer.innerHTML = events.map(event => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card event-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${event.name}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">
                            ${new Date(event.start_date).toLocaleDateString()} - 
                            ${new Date(event.end_date).toLocaleDateString()}
                        </h6>
                        <p class="card-text">${event.description || 'No description'}</p>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-primary view-event" data-id="${event.id}">View Details</button>
                        ${event.creator_id == (state.currentUser?.id || 0) ? 
                            `<button class="btn btn-sm btn-outline-danger delete-event float-end" data-id="${event.id}">Delete</button>` : ''
                        }
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        document.querySelectorAll('.view-event').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.id;
                showEventDetails(eventId);
            });
        });
        
        document.querySelectorAll('.delete-event').forEach(button => {
            button.addEventListener('click', async (e) => {
                const eventId = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this event?')) {
                    try {
                        await ApiService.deleteEvent(eventId);
                        ApiService.showNotification('Success', 'Event deleted successfully', 'success');
                        showEventsPage(); // Refresh the page
                    } catch (error) {
                        // Error is handled by API service
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error displaying events:', error);
    }
}

// Show event details
async function showEventDetails(eventId) {
    mainContent.innerHTML = `
        <div class="text-center">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    try {
        const event = await ApiService.getEvent(eventId);
        
        mainContent.innerHTML = `
            <div class="mb-4">
                <button class="btn btn-outline-secondary btn-sm" id="back-to-events">
                    &larr; Back to Events
                </button>
            </div>
            
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="mb-0">${event.name}</h3>
                    ${event.creator_id == (state.currentUser?.id || 0) ? 
                        `<button class="btn btn-sm btn-outline-primary" id="edit-event">Edit Event</button>` : ''
                    }
                </div>
                <div class="card-body">
                    <p class="text-muted">
                        Created by: ${event.creator_name}<br>
                        Dates: ${new Date(event.start_date).toLocaleDateString()} - 
                        ${new Date(event.end_date).toLocaleDateString()}
                    </p>
                    <p>${event.description || 'No description'}</p>
                </div>
            </div>
            
            <h4 class="mb-3">Activities</h4>
            ${event.creator_id == (state.currentUser?.id || 0) ? 
                `<button class="btn btn-primary mb-3" id="add-activity">Add Activity</button>` : ''
            }
            
            <div id="activities-container">
                ${event.activities.length
                    ? event.activities.map(activity => `
                        <div class="card mb-3">
                            <div class="card-body">
                                <h5 class="card-title">${activity.name}</h5>
                                <p class="card-text">${activity.description || 'No description'}</p>
                                <p class="card-text">Date: ${new Date(activity.date).toLocaleDateString()}</p>
                                <p class="card-text">Score Categories: ${activity.score_categories.join(', ') || 'None'}</p>
                            </div>
                        </div>
                    `).join('')
                    : '<div class="alert alert-info">No activities found. Add your first activity!</div>'
                }
            </div>
        `;
        
        if (event.creator_id == (state.currentUser?.id || 0)) {
            document.getElementById('add-activity').addEventListener('click', () => showAddActivityForm(eventId));
        }
    } catch (error) {
        console.error('Error fetching event details:', error);
        ApiService.showNotification('Error', 'Failed to load event details', 'error');
        showEventsPage();
    }
}

// Create a new event
function createEvent(eventData) {
    return new Promise((resolve, reject) => {
        if (!state.currentUser) {
            reject('You must be logged in to create an event');
            return;
        }
        
        const newEvent = {
            id: Date.now().toString(),
            creatorId: state.currentUser.id,
            name: eventData.name,
            description: eventData.description,
            startDate: eventData.startDate,
            endDate: eventData.endDate,
            activities: [],
            activityLeaders: [],
            createdAt: new Date().toISOString()
        };
        
        const events = fetchEvents();
        events.push(newEvent);
        localStorage.setItem('events', JSON.stringify(events));
        state.events = events;
        
        resolve(newEvent);
    });
}

// Add activity to event
function addActivity(eventId, activityData) {
    return new Promise((resolve, reject) => {
        const events = fetchEvents();
        const eventIndex = events.findIndex(e => e.id === eventId);
        
        if (eventIndex === -1) {
            reject('Event not found');
            return;
        }
        
        const event = events[eventIndex];
        
        // Check if user is authorized
        if (event.creatorId !== state.currentUser.id) {
            reject('Not authorized to modify this event');
            return;
        }
        
        const newActivity = {
            id: Date.now().toString(),
            name: activityData.name,
            description: activityData.description,
            scoreCategories: activityData.scoreCategories || [],
            date: activityData.date,
            scores: []
        };
        
        event.activities.push(newActivity);
        localStorage.setItem('events', JSON.stringify(events));
        state.events = events;
        
        resolve(newActivity);
    });
}

// Assign activity leader
function assignActivityLeader(eventId, activityId, leaderId) {
    // Implementation would go here
}

// Record activity score
function recordScore(eventId, activityId, scoreData) {
    // Implementation would go here
}

// Ensure functions are available globally
window.showEventsPage = showEventsPage;
window.showEventDetails = showEventDetails;
