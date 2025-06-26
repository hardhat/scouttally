// Show rankings page
async function showRankingsPage() {
    mainContent.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-trophy me-2 text-warning"></i>Rankings</h2>
            <div class="btn-group" role="group">
                <button type="button" class="btn btn-outline-primary active" id="current-event-btn">
                    <i class="bi bi-calendar-event me-1"></i>Current Event
                </button>
                <button type="button" class="btn btn-outline-primary" id="all-events-btn">
                    <i class="bi bi-globe me-1"></i>All Events
                </button>
            </div>
        </div>

        <div id="rankings-content">
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted"><i class="bi bi-hourglass-split me-1"></i>Loading rankings...</p>
            </div>
        </div>
    `;

    // Add event listeners for toggle buttons
    document.getElementById('current-event-btn').addEventListener('click', () => {
        setActiveButton('current-event-btn');
        showCurrentEventRankings();
    });

    document.getElementById('all-events-btn').addEventListener('click', () => {
        setActiveButton('all-events-btn');
        showAllEventsRankings();
    });

    // Load current event rankings by default
    await showCurrentEventRankings();
}

// Show current event rankings
async function showCurrentEventRankings() {
    const rankingsContent = document.getElementById('rankings-content');

    // Check if user is logged in
    if (!state.currentUser) {
        rankingsContent.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Please log in to view rankings.
            </div>
        `;
        return;
    }

    try {
        // Get the most recent event or let user select
        const response = await ApiService.getEvents();
        console.log('API Response:', response); // Debug log
        const events = Array.isArray(response) ? response : (response.events || []);

        if (!Array.isArray(events) || events.length === 0) {
            rankingsContent.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    No events found. Create an event to see rankings.
                </div>
            `;
            return;
        }

        // Find the most recent event (by start date)
        const currentEvent = events.reduce((latest, event) => {
            return new Date(event.start_date) > new Date(latest.start_date) ? event : latest;
        });

        // Show event selector if multiple events
        let eventSelectorHtml = '';
        if (events.length > 1) {
            eventSelectorHtml = `
                <div class="card mb-4">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <label for="event-selector" class="form-label">
                                    <i class="bi bi-calendar-event me-1"></i>Select Event
                                </label>
                                <select class="form-select" id="event-selector">
                                    ${events.map(event => `
                                        <option value="${event.id}" ${event.id === currentEvent.id ? 'selected' : ''}>
                                            ${event.name} (${new Date(event.start_date).toLocaleDateString()})
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <button class="btn btn-primary" id="load-event-rankings">
                                    <i class="bi bi-arrow-clockwise me-1"></i>Load Rankings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        rankingsContent.innerHTML = eventSelectorHtml + `
            <div id="event-rankings-display">
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 text-muted">Loading event rankings...</p>
                </div>
            </div>
        `;

        // Add event listener for event selector
        if (events.length > 1) {
            document.getElementById('load-event-rankings').addEventListener('click', () => {
                const selectedEventId = document.getElementById('event-selector').value;
                loadEventRankings(selectedEventId);
            });
        }

        // Load rankings for current event
        await loadEventRankings(currentEvent.id);

    } catch (error) {
        console.error('Error loading current event rankings:', error);
        console.error('Error details:', error.message);
        rankingsContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load rankings. Please try again.
                <br><small class="text-muted">Error: ${error.message}</small>
            </div>
        `;
    }
}

// Load rankings for a specific event
async function loadEventRankings(eventId) {
    const displayContainer = document.getElementById('event-rankings-display');

    // Show loading state
    displayContainer.innerHTML = `
        <div class="text-center p-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading rankings...</span>
            </div>
            <p class="mt-2 text-muted">Loading rankings...</p>
        </div>
    `;

    try {
        const rankingsData = await ApiService.getEventRankings(eventId);
        
        if (!rankingsData.event) {
            throw new Error('Event data not found');
        }

        displayContainer.innerHTML = `
            <div class="card mb-4">
                <div class="card-header">
                    <h4 class="mb-0">
                        <i class="bi bi-trophy me-2 text-warning"></i>${rankingsData.event.name}
                    </h4>
                    <p class="mb-0 text-muted">
                        <i class="bi bi-people me-1"></i>${rankingsData.total_teams || 0} teams •
                        <i class="bi bi-list-task me-1"></i>${rankingsData.total_activities || 0} activities
                    </p>
                </div>
            </div>

            <div class="row">
                <div class="col-lg-8">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-bar-chart me-2"></i>Team Rankings</h5>
                        </div>
                        <div class="card-body">
                            ${generateRankingsTable(rankingsData.teams || [])}
                        </div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-graph-up me-2"></i>Statistics</h6>
                        </div>
                        <div class="card-body">
                            ${generateRankingsStats(rankingsData)}
                        </div>
                    </div>

                    <div class="card mt-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-list-task me-2"></i>Activities</h6>
                        </div>
                        <div class="card-body">
                            ${(rankingsData.activities || []).map(activity => `
                                <div class="mb-3">
                                    <strong class="small">${activity.name}</strong>
                                    <div class="text-muted small">
                                        <i class="bi bi-calendar-event me-1"></i>${new Date(activity.activity_date).toLocaleDateString()}
                                        <br>
                                        <i class="bi bi-star me-1"></i>Max: ${activity.max_possible_score} points
                                        <br>
                                        ${activity.leaders && activity.leaders.length > 0 ? 
                                            `<i class="bi bi-person me-1"></i>Leaders: ${activity.leaders.map(l => l.name).join(', ')}` : 
                                            '<i class="bi bi-person me-1"></i>No leaders assigned'}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error loading event rankings:', error);
        displayContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load rankings for this event.
            </div>
        `;
    }
}

// Show all events rankings
async function showAllEventsRankings() {
    const rankingsContent = document.getElementById('rankings-content');

    // Check if user is logged in
    if (!state.currentUser) {
        rankingsContent.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Please log in to view rankings.
            </div>
        `;
        return;
    }

    try {
        const response = await ApiService.getEvents();
        const events = Array.isArray(response) ? response : (response.events || []);

        console.log('Events response:', response); // Debug log
        console.log('Processed events:', events); // Debug log

        if (!Array.isArray(events) || events.length === 0) {
            rankingsContent.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    No events found. Create an event to see rankings.
                </div>
            `;
            return;
        }

        // Ensure events is an array before mapping
        const eventCards = Array.isArray(events) ? events.map(event => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100">
                    <div class="card-body">
                        <h6 class="card-title">
                            <i class="bi bi-calendar-event me-1"></i>${event.name || 'Unnamed Event'}
                        </h6>
                        <p class="card-text small text-muted">
                            ${event.start_date ? new Date(event.start_date).toLocaleDateString() : 'No date'} -
                            ${event.end_date ? new Date(event.end_date).toLocaleDateString() : 'No date'}
                        </p>
                        <button class="btn btn-sm btn-outline-primary view-event-rankings"
                                data-event-id="${event.id}">
                            <i class="bi bi-trophy me-1"></i>View Rankings
                        </button>
                    </div>
                </div>
            </div>
        `).join('') : '<div class="col-12"><div class="alert alert-warning">Unable to load events</div></div>';

        rankingsContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h4 class="mb-0">
                        <i class="bi bi-globe me-2"></i>All Events Overview
                    </h4>
                    <p class="mb-0 text-muted">Rankings across all ${events.length} events</p>
                </div>
                <div class="card-body">
                    <div class="row">
                        ${eventCards}
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for view rankings buttons
        document.querySelectorAll('.view-event-rankings').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.closest('button').dataset.eventId;
                setActiveButton('current-event-btn');
                showCurrentEventRankings();
                // After loading, select the specific event
                setTimeout(() => {
                    const eventSelector = document.getElementById('event-selector');
                    if (eventSelector) {
                        eventSelector.value = eventId;
                        loadEventRankings(eventId);
                    }
                }, 500);
            });
        });

    } catch (error) {
        console.error('Error loading all events:', error);
        console.error('Error details:', error.message);
        rankingsContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load events. Please try again.
                <br><small class="text-muted">Error: ${error.message}</small>
            </div>
        `;
    }
}

// Generate rankings table HTML
function generateRankingsTable(teams = []) {
    if (!teams || teams.length === 0) {
        return `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                No teams found for this event. Teams will appear here once they participate in activities.
            </div>
        `;
    }

    return `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-light">
                    <tr>
                        <th width="60"><i class="bi bi-hash"></i></th>
                        <th><i class="bi bi-people me-1"></i>Team</th>
                        <th class="text-center">Total Score</th>
                        <th class="text-center">Percentage</th>
                        <th class="text-center">Progress</th>
                    </tr>
                </thead>
                <tbody>
                    ${teams.map((team, index) => {
                        const rankClass = index === 0 ? 'table-warning' : index === 1 ? 'table-light' : index === 2 ? 'table-secondary' : '';
                        const rankIcon = index === 0 ? '<i class="bi bi-trophy-fill text-warning"></i>' :
                                        index === 1 ? '<i class="bi bi-award-fill text-secondary"></i>' :
                                        index === 2 ? '<i class="bi bi-award text-dark"></i>' : team.rank;

                        return `
                            <tr class="${rankClass}">
                                <td class="text-center fw-bold">${rankIcon}</td>
                                <td>
                                    <strong>${team.name}</strong>
                                    ${index < 3 ? '<i class="bi bi-star-fill text-warning ms-1"></i>' : ''}
                                </td>
                                <td class="text-center">
                                    <span class="badge bg-primary">${parseFloat(team.total_score || 0).toFixed(1)}</span>
                                    <small class="text-muted d-block">/ ${parseFloat(team.max_possible_score || 0).toFixed(1)}</small>
                                </td>
                                <td class="text-center">
                                    <strong>${parseFloat(team.score_percentage || 0).toFixed(1)}%</strong>
                                </td>
                                <td class="text-center">
                                    <div class="progress" style="height: 20px; min-width: 100px;">
                                        <div class="progress-bar ${index === 0 ? 'bg-warning' : index === 1 ? 'bg-info' : index === 2 ? 'bg-secondary' : 'bg-primary'}"
                                             role="progressbar"
                                             style="width: ${parseFloat(team.score_percentage || 0)}%"
                                             aria-valuenow="${parseFloat(team.score_percentage || 0)}"
                                             aria-valuemin="0"
                                             aria-valuemax="100">
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Generate rankings statistics
function generateRankingsStats(rankingsData) {
    const teams = rankingsData.teams;

    if (teams.length === 0) {
        return '<div class="text-muted">No statistics available</div>';
    }

    // Get max possible score from the first team (all teams have the same max possible score)
    const maxPossibleScore = parseFloat(teams[0]?.max_possible_score || 0);
    
    // Calculate statistics
    const topTeam = teams[0];
    const avgScore = teams.reduce((sum, team) => sum + parseFloat(team.total_score || 0), 0) / teams.length;
    const avgPercentage = maxPossibleScore > 0 ? (avgScore / maxPossibleScore) * 100 : 0;

    return `
        <div class="row text-center">
            <div class="col-6 mb-3">
                <div class="text-warning fw-bold fs-4">${parseFloat(topTeam.total_score || 0).toFixed(1)}</div>
                <small class="text-muted">Highest Score</small>
                <div class="small text-primary">${topTeam.name}</div>
            </div>
            <div class="col-6 mb-3">
                <div class="text-info fw-bold fs-4">${avgScore.toFixed(1)}</div>
                <small class="text-muted">Average Score</small>
            </div>
            <div class="col-6 mb-3">
                <div class="text-success fw-bold fs-4">${maxPossibleScore.toFixed(1)}</div>
                <small class="text-muted">Max Possible</small>
            </div>
            <div class="col-6 mb-3">
                <div class="text-primary fw-bold fs-4">${avgPercentage.toFixed(1)}%</div>
                <small class="text-muted">Avg Percentage</small>
            </div>
        </div>

        <hr>

        <div class="mb-2">
            <strong class="small">Competition Status</strong>
        </div>
        <div class="small text-muted">
            ${teams.filter(t => (parseFloat(t.score_percentage || 0) > 80)).length} teams above 80%<br>
            ${teams.filter(t => (parseFloat(t.score_percentage || 0) > 60)).length} teams above 60%<br>
            ${teams.filter(t => parseFloat(t.total_score || 0) > 0).length} teams have participated
        </div>
    `;
}

// Set active button in toggle group
function setActiveButton(activeId) {
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(activeId).classList.add('active');
}

// Ensure functions are available globally
window.showRankingsPage = showRankingsPage;
window.showCurrentEventRankings = showCurrentEventRankings;
window.showAllEventsRankings = showAllEventsRankings;
window.loadEventRankings = loadEventRankings;