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

// Show events page, optionally focusing on a specific event
async function showEventsPage(eventId = null) {
    mainContent.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-calendar-event me-2"></i>Events</h2>
            ${state.currentUser ? '<button class="btn btn-primary" id="create-event-btn"><i class="bi bi-plus-circle me-2"></i>Create New Event</button>' : ''}
        </div>
        <div class="row" id="events-container">
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted"><i class="bi bi-hourglass-split me-1"></i>Loading events...</p>
            </div>
        </div>
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
                        <i class="bi bi-info-circle me-2"></i>
                        No events found. ${state.currentUser ? 'Create your first event!' : 'Please login to create events.'}
                    </div>
                </div>
            `;
            return;
        }
        
        eventsContainer.innerHTML = events.map(event => `
            <div class="col-md-6 col-lg-4 mb-4" ${eventId === event.id ? 'id="focused-event"' : ''}>
                <div class="card event-card h-100 ${eventId === event.id ? 'border-primary' : ''}">
                    <div class="card-body">
                        <h5 class="card-title"><i class="bi bi-calendar-event me-2"></i>${event.name}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">
                            <i class="bi bi-calendar-range me-1"></i>
                            ${new Date(event.start_date).toLocaleDateString()} -
                            ${new Date(event.end_date).toLocaleDateString()}
                        </h6>
                        <p class="card-text"><i class="bi bi-card-text me-1"></i>${event.description || 'No description'}</p>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-primary view-event" data-id="${event.id}">
                            <i class="bi bi-eye me-1"></i>View Details
                        </button>
                        ${event.creator_id == (state.currentUser?.id || 0) ?
                            `<button class="btn btn-sm btn-outline-danger delete-event float-end" data-id="${event.id}">
                                <i class="bi bi-trash me-1"></i>Delete
                            </button>` : ''
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
                    <i class="bi bi-arrow-left me-1"></i>Back to Events
                </button>
            </div>

            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="mb-0"><i class="bi bi-calendar-event me-2"></i>${event.name}</h3>
                    ${event.creator_id == (state.currentUser?.id || 0) ?
                        `<button class="btn btn-sm btn-outline-primary" id="edit-event">
                            <i class="bi bi-pencil me-1"></i>Edit Event
                        </button>` : ''
                    }
                </div>
                <div class="card-body">
                    <p class="text-muted">
                        <i class="bi bi-person me-1"></i>Created by: ${event.creator_name}<br>
                        <i class="bi bi-calendar-range me-1"></i>Dates: ${new Date(event.start_date).toLocaleDateString()} -
                        ${new Date(event.end_date).toLocaleDateString()}
                    </p>
                    <p><i class="bi bi-card-text me-1"></i>${event.description || 'No description'}</p>
                </div>
            </div>

            <h4 class="mb-3"><i class="bi bi-list-task me-2"></i>Activities</h4>
            ${event.creator_id == (state.currentUser?.id || 0) ?
                `<button class="btn btn-primary mb-3" id="add-activity">
                    <i class="bi bi-plus-circle me-2"></i>Add Activity
                </button>` : ''
            }
            
            <div id="activities-container">
                ${event.activities.length
                    ? event.activities.map(activity => `
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title mb-0"><i class="bi bi-clipboard-check me-2"></i>${activity.name}</h5>
                                    ${event.creator_id == (state.currentUser?.id || 0) ?
                                        `<button class="btn btn-outline-primary btn-sm edit-activity" data-id="${activity.id}">
                                            <i class="bi bi-pencil me-1"></i>Edit
                                        </button>` : ''
                                    }
                                </div>
                                <p class="card-text"><i class="bi bi-card-text me-1"></i>${activity.description || 'No description'}</p>
                                <p class="card-text"><i class="bi bi-calendar-date me-1"></i>Date: ${new Date(activity.activity_date).toLocaleDateString()}</p>
                                <p class="card-text">
                                    <i class="bi bi-people me-1"></i>Leaders: 
                                    ${activity.leaders && activity.leaders.length > 0
                                        ? `<span class="text-primary">${activity.leaders.map(leader => leader.name).join(', ')}</span>`
                                        : '<span class="text-muted">No leaders assigned</span>'
                                    }
                                    ${activity.leader_count > 0 ? 
                                        `<span class="badge bg-primary ms-2">${activity.leader_count} ${activity.leader_count === 1 ? 'leader' : 'leaders'}</span>` 
                                        : ''
                                    }
                                </p>
                                <p class="card-text"><i class="bi bi-award me-1"></i>Score Categories: ${
                                    activity.score_categories && activity.score_categories.length > 0
                                        ? activity.score_categories.map(cat => `${cat.name} (${cat.max_score} pts)`).join(', ')
                                        : 'None defined'
                                }</p>
                            </div>
                            ${(event.creator_id == (state.currentUser?.id || 0)) || (activity.is_leader) ?
                                `<div class="card-footer">
                                    <button class="btn btn-sm btn-success score-activity" data-activity-id="${activity.id}">
                                        <i class="bi bi-calculator me-1"></i>Score Teams
                                    </button>
                                </div>` : ''
                            }
                        </div>
                    `).join('')
                    : '<div class="alert alert-info"><i class="bi bi-info-circle me-2"></i>No activities found. Add your first activity!</div>'
                }
            </div>
        `;
        
        // Add event listeners for creator actions
        if (event.creator_id == (state.currentUser?.id || 0)) {
            document.getElementById('add-activity').addEventListener('click', () => showAddActivityForm(eventId));

            // Add edit event listener
            const editButton = document.getElementById('edit-event');
            if (editButton) {
                editButton.addEventListener('click', () => showEditEventForm(eventId));
            }
        }

        // Add edit activity event listeners
        if (event.creator_id == (state.currentUser?.id || 0)) {
            document.querySelectorAll('.edit-activity').forEach(button => {
                button.addEventListener('click', (e) => {
                    const activityId = e.target.closest('button').dataset.id;
                    window.showEditActivityForm(activityId);
                });
            });
        }

        // Add score activity event listeners
        document.querySelectorAll('.score-activity').forEach(button => {
            button.addEventListener('click', (e) => {
                const activityId = e.target.closest('button').dataset.activityId;
                showActivityScoringPage(activityId);
            });
        });

        // Back to events button
        document.getElementById('back-to-events').addEventListener('click', showEventsPage);
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

// Show create event form
function showCreateEventForm() {
    mainContent.innerHTML = `
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-6">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="bi bi-plus-circle me-2"></i>Create New Event</h3>
                    </div>
                    <div class="card-body">
                        <form id="create-event-form">
                            <div class="mb-3">
                                <label for="event-name" class="form-label"><i class="bi bi-calendar-event me-1"></i>Event Name *</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-calendar-event"></i></span>
                                    <input type="text" class="form-control" id="event-name" required placeholder="Enter event name">
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="event-description" class="form-label"><i class="bi bi-card-text me-1"></i>Description</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-card-text"></i></span>
                                    <textarea class="form-control" id="event-description" rows="3"
                                        placeholder="Optional description of the event"></textarea>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="start-date" class="form-label"><i class="bi bi-calendar-date me-1"></i>Start Date *</label>
                                        <div class="input-group">
                                            <span class="input-group-text"><i class="bi bi-calendar-date"></i></span>
                                            <input type="date" class="form-control" id="start-date" required>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="end-date" class="form-label"><i class="bi bi-calendar-check me-1"></i>End Date *</label>
                                        <div class="input-group">
                                            <span class="input-group-text"><i class="bi bi-calendar-check"></i></span>
                                            <input type="date" class="form-control" id="end-date" required>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="alert alert-info">
                                <small>
                                    <i class="bi bi-info-circle"></i>
                                    The event can span multiple days. Activities can be scheduled on any day within this range.
                                </small>
                            </div>

                            <div class="d-flex justify-content-between">
                                <button type="button" class="btn btn-secondary" id="cancel-create-event">
                                    <i class="bi bi-x-circle me-1"></i>Cancel
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-plus-circle me-1"></i>Create Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('start-date').min = today;
    document.getElementById('end-date').min = today;

    // Update end date minimum when start date changes
    document.getElementById('start-date').addEventListener('change', function() {
        const startDate = this.value;
        const endDateInput = document.getElementById('end-date');
        endDateInput.min = startDate;

        // If end date is before start date, update it
        if (endDateInput.value && endDateInput.value < startDate) {
            endDateInput.value = startDate;
        }
    });

    // Cancel button
    document.getElementById('cancel-create-event').addEventListener('click', () => {
        showEventsPage();
    });

    // Form submission
    document.getElementById('create-event-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('event-name').value.trim();
        const description = document.getElementById('event-description').value.trim();
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        // Validation
        if (!name) {
            ApiService.showNotification('Error', 'Event name is required', 'error');
            return;
        }

        if (!startDate || !endDate) {
            ApiService.showNotification('Error', 'Both start and end dates are required', 'error');
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            ApiService.showNotification('Error', 'End date cannot be before start date', 'error');
            return;
        }

        try {
            const eventData = {
                name: name,
                description: description,
                start_date: startDate,
                end_date: endDate
            };

            const newEvent = await ApiService.createEvent(eventData);
            ApiService.showNotification('Success', 'Event created successfully!', 'success');
            showEventDetails(newEvent.id);
        } catch (error) {
            // Error is already handled by the API service
        }
    });
}

// Show edit event form
async function showEditEventForm(eventId) {
    try {
        // Fetch current event data
        const event = await ApiService.getEvent(eventId);

        mainContent.innerHTML = `
            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="bi bi-pencil me-2"></i>Edit Event</h3>
                        </div>
                        <div class="card-body">
                            <form id="edit-event-form">
                                <div class="mb-3">
                                    <label for="edit-event-name" class="form-label">Event Name *</label>
                                    <input type="text" class="form-control" id="edit-event-name"
                                           value="${event.name}" required>
                                </div>

                                <div class="mb-3">
                                    <label for="edit-event-description" class="form-label">Description</label>
                                    <textarea class="form-control" id="edit-event-description" rows="3"
                                        placeholder="Optional description of the event">${event.description || ''}</textarea>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-start-date" class="form-label">Start Date *</label>
                                            <input type="date" class="form-control" id="edit-start-date"
                                                   value="${event.start_date}" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="edit-end-date" class="form-label">End Date *</label>
                                            <input type="date" class="form-control" id="edit-end-date"
                                                   value="${event.end_date}" required>
                                        </div>
                                    </div>
                                </div>

                                <div class="alert alert-warning">
                                    <small>
                                        <i class="bi bi-exclamation-triangle"></i>
                                        Changing dates may affect existing activities scheduled for this event.
                                    </small>
                                </div>

                                <div class="d-flex justify-content-between">
                                    <button type="button" class="btn btn-secondary" id="cancel-edit-event">
                                        <i class="bi bi-x-circle me-1"></i>Cancel
                                    </button>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-check-circle me-1"></i>Update Event
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Set minimum date to today for future events, or keep original date for past events
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('edit-start-date');
        const endDateInput = document.getElementById('edit-end-date');

        // Only restrict dates if the event hasn't started yet
        if (event.start_date >= today) {
            startDateInput.min = today;
        }

        // Update end date minimum when start date changes
        startDateInput.addEventListener('change', function() {
            const startDate = this.value;
            endDateInput.min = startDate;

            // If end date is before start date, update it
            if (endDateInput.value && endDateInput.value < startDate) {
                endDateInput.value = startDate;
            }
        });

        // Set initial minimum for end date
        endDateInput.min = startDateInput.value;

        // Cancel button
        document.getElementById('cancel-edit-event').addEventListener('click', () => {
            showEventDetails(eventId);
        });

        // Form submission
        document.getElementById('edit-event-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('edit-event-name').value.trim();
            const description = document.getElementById('edit-event-description').value.trim();
            const startDate = document.getElementById('edit-start-date').value;
            const endDate = document.getElementById('edit-end-date').value;

            // Validation
            if (!name) {
                ApiService.showNotification('Error', 'Event name is required', 'error');
                return;
            }

            if (!startDate || !endDate) {
                ApiService.showNotification('Error', 'Both start and end dates are required', 'error');
                return;
            }

            if (new Date(endDate) < new Date(startDate)) {
                ApiService.showNotification('Error', 'End date cannot be before start date', 'error');
                return;
            }

            try {
                const eventData = {
                    name: name,
                    description: description,
                    start_date: startDate,
                    end_date: endDate
                };

                await ApiService.updateEvent(eventId, eventData);
                ApiService.showNotification('Success', 'Event updated successfully!', 'success');
                showEventDetails(eventId);
            } catch (error) {
                // Error is already handled by the API service
            }
        });

    } catch (error) {
        console.error('Error loading event for editing:', error);
        ApiService.showNotification('Error', 'Failed to load event details', 'error');
        showEventsPage();
    }
}

// Show activity scoring page
async function showActivityScoringPage(activityId) {
    mainContent.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted"><i class="bi bi-hourglass-split me-1"></i>Loading scoring interface...</p>
        </div>
    `;

    try {
        const activity = await ApiService.getActivityForScoring(activityId);

        mainContent.innerHTML = `
            <div class="mb-4">
                <button class="btn btn-outline-secondary btn-sm" id="back-to-event">
                    <i class="bi bi-arrow-left me-1"></i>Back to Event
                </button>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3 class="mb-0"><i class="bi bi-calculator me-2"></i>Score Teams - ${activity.name}</h3>
                    <p class="mb-0 text-muted"><i class="bi bi-calendar-event me-1"></i>Event: ${activity.event_name}</p>
                </div>
                <div class="card-body">
                    <p><i class="bi bi-card-text me-1"></i>${activity.description || 'No description'}</p>
                    <p><i class="bi bi-calendar-date me-1"></i>Date: ${new Date(activity.activity_date).toLocaleDateString()}</p>
                </div>
            </div>

            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="bi bi-people me-2"></i>Teams & Scoring</h5>
                            <button class="btn btn-sm btn-outline-primary" id="add-team-btn">
                                <i class="bi bi-plus-circle me-1"></i>Add Team
                            </button>
                        </div>
                        <div class="card-body">
                            <div id="scoring-interface">
                                ${activity.teams.length > 0 ?
                                    generateScoringTable(activity) :
                                    '<div class="alert alert-info"><i class="bi bi-info-circle me-2"></i>No teams found. Add teams to start scoring.</div>'
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-award me-2"></i>Score Categories</h6>
                        </div>
                        <div class="card-body">
                            ${activity.score_categories.length > 0 ?
                                activity.score_categories.map(cat => `
                                    <div class="mb-2">
                                        <strong>${cat.name}</strong><br>
                                        <small class="text-muted">Max: ${cat.max_score} points</small>
                                    </div>
                                `).join('') :
                                '<div class="text-muted">No score categories defined</div>'
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Store activity data for use in other functions
        window.currentScoringActivity = activity;

        // Add event listeners
        document.getElementById('back-to-event').addEventListener('click', () => {
            showEventDetails(activity.event_id);
        });

        document.getElementById('add-team-btn').addEventListener('click', () => {
            showAddTeamModal(activity.event_id);
        });

        // Add scoring event listeners
        addScoringEventListeners();

    } catch (error) {
        console.error('Error loading activity for scoring:', error);
        ApiService.showNotification('Error', 'Failed to load scoring interface', 'error');
        showEventsPage();
    }
}

// Generate scoring table HTML
function generateScoringTable(activity) {
    if (activity.score_categories.length === 0) {
        return '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>No score categories defined for this activity.</div>';
    }

    // Create a map of existing scores for quick lookup
    const scoreMap = {};
    activity.scores.forEach(score => {
        const key = `${score.team_id}-${score.category_id}`;
        scoreMap[key] = score;
    });

    return `
        <div class="table-responsive">
            <table class="table table-bordered">
                <thead class="table-light">
                    <tr>
                        <th><i class="bi bi-people me-1"></i>Team</th>
                        ${activity.score_categories.map(cat =>
                            `<th class="text-center">${cat.name}<br><small class="text-muted">(Max: ${cat.max_score})</small></th>`
                        ).join('')}
                        <th class="text-center">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${activity.teams.map(team => {
                        let totalScore = 0;
                        const teamRow = `
                            <tr>
                                <td><strong>${team.name}</strong></td>
                                ${activity.score_categories.map(category => {
                                    const scoreKey = `${team.id}-${category.id}`;
                                    const existingScore = scoreMap[scoreKey];
                                    const scoreValue = existingScore ? existingScore.score_value : '';
                                    if (existingScore) totalScore += parseFloat(existingScore.score_value);

                                    return `
                                        <td class="text-center">
                                            <input type="number"
                                                   class="form-control form-control-sm score-input"
                                                   data-team-id="${team.id}"
                                                   data-category-id="${category.id}"
                                                   data-max-score="${category.max_score}"
                                                   value="${scoreValue}"
                                                   min="0"
                                                   max="${category.max_score}"
                                                   step="0.1"
                                                   placeholder="0">
                                        </td>
                                    `;
                                }).join('')}
                                <td class="text-center"><strong class="team-total" data-team-id="${team.id}">${totalScore.toFixed(1)}</strong></td>
                            </tr>
                        `;
                        return teamRow;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="mt-3">
            <button class="btn btn-success" id="save-all-scores">
                <i class="bi bi-check-circle me-1"></i>Save All Scores
            </button>
            <button class="btn btn-outline-secondary ms-2" id="reset-scores">
                <i class="bi bi-arrow-clockwise me-1"></i>Reset Changes
            </button>
        </div>
    `;
}

// Add scoring event listeners
function addScoringEventListeners() {
    // Score input change listeners
    document.querySelectorAll('.score-input').forEach(input => {
        input.addEventListener('input', function() {
            const maxScore = parseFloat(this.dataset.maxScore);
            const value = parseFloat(this.value);

            // Validate score range
            if (value > maxScore) {
                this.value = maxScore;
                ApiService.showNotification('Warning', `Score cannot exceed ${maxScore}`, 'warning');
            } else if (value < 0) {
                this.value = 0;
            }

            // Update team total
            updateTeamTotal(this.dataset.teamId);
        });

        // Auto-save on blur
        input.addEventListener('blur', function() {
            if (this.value !== '') {
                saveIndividualScore(this);
            }
        });
    });

    // Save all scores button
    document.getElementById('save-all-scores')?.addEventListener('click', saveAllScores);

    // Reset scores button
    document.getElementById('reset-scores')?.addEventListener('click', resetScores);
}

// Update team total score
function updateTeamTotal(teamId) {
    const teamInputs = document.querySelectorAll(`input[data-team-id="${teamId}"]`);
    let total = 0;

    teamInputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
    });

    const totalElement = document.querySelector(`.team-total[data-team-id="${teamId}"]`);
    if (totalElement) {
        totalElement.textContent = total.toFixed(1);
    }
}

// Save individual score
async function saveIndividualScore(input) {
    const teamId = input.dataset.teamId;
    const categoryId = input.dataset.categoryId;
    const scoreValue = parseFloat(input.value) || 0;
    const activityId = window.currentScoringActivity.id;

    try {
        await ApiService.submitScore(activityId, teamId, categoryId, scoreValue);
        input.classList.add('is-valid');
        setTimeout(() => input.classList.remove('is-valid'), 2000);
    } catch (error) {
        input.classList.add('is-invalid');
        setTimeout(() => input.classList.remove('is-invalid'), 3000);
        console.error('Error saving score:', error);
    }
}

// Save all scores
async function saveAllScores() {
    const scoreInputs = document.querySelectorAll('.score-input');
    const saveButton = document.getElementById('save-all-scores');

    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Saving...';

    let successCount = 0;
    let errorCount = 0;

    for (const input of scoreInputs) {
        if (input.value !== '') {
            try {
                await saveIndividualScore(input);
                successCount++;
            } catch (error) {
                errorCount++;
            }
        }
    }

    saveButton.disabled = false;
    saveButton.innerHTML = '<i class="bi bi-check-circle me-1"></i>Save All Scores';

    if (errorCount === 0) {
        ApiService.showNotification('Success', `${successCount} scores saved successfully!`, 'success');
    } else {
        ApiService.showNotification('Warning', `${successCount} scores saved, ${errorCount} failed`, 'warning');
    }
}

// Reset scores to original values
function resetScores() {
    if (confirm('Are you sure you want to reset all changes?')) {
        showActivityScoringPage(window.currentScoringActivity.id);
    }
}

// Show add team modal
function showAddTeamModal(eventId) {
    const modalHtml = `
        <div class="modal fade" id="addTeamModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-plus-circle me-2"></i>Add New Team</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="add-team-form">
                            <div class="mb-3">
                                <label for="team-name" class="form-label"><i class="bi bi-people me-1"></i>Team Name *</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-people"></i></span>
                                    <input type="text" class="form-control" id="team-name" required
                                           placeholder="Enter team name">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i>Cancel
                        </button>
                        <button type="button" class="btn btn-primary" id="save-team-btn">
                            <i class="bi bi-plus-circle me-1"></i>Add Team
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('addTeamModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addTeamModal'));
    modal.show();

    // Add event listeners
    document.getElementById('save-team-btn').addEventListener('click', async () => {
        const teamName = document.getElementById('team-name').value.trim();

        if (!teamName) {
            ApiService.showNotification('Error', 'Team name is required', 'error');
            return;
        }

        try {
            await ApiService.addTeam(eventId, teamName);
            ApiService.showNotification('Success', 'Team added successfully!', 'success');
            modal.hide();
            // Refresh the scoring page
            showActivityScoringPage(window.currentScoringActivity.id);
        } catch (error) {
            // Error already handled by API service
        }
    });

    // Focus on team name input
    document.getElementById('team-name').focus();
}

// Ensure functions are available globally
window.showEventsPage = showEventsPage;
window.showEventDetails = showEventDetails;
window.showCreateEventForm = showCreateEventForm;
window.showEditEventForm = showEditEventForm;
window.showActivityScoringPage = showActivityScoringPage;
