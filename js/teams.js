// Fetch all teams
function fetchTeams() {
    const teams = JSON.parse(localStorage.getItem('teams') || '[]');
    state.teams = teams;
    return teams;
}

// Create a new team
function createTeam(teamData) {
    return new Promise((resolve, reject) => {
        if (!state.currentUser) {
            reject('You must be logged in to create a team');
            return;
        }
        
        const newTeam = {
            id: Date.now().toString(),
            name: teamData.name,
            members: teamData.members || [],
            createdBy: state.currentUser.id,
            createdAt: new Date().toISOString()
        };
        
        const teams = fetchTeams();
        teams.push(newTeam);
        localStorage.setItem('teams', JSON.stringify(teams));
        state.teams = teams;
        
        resolve(newTeam);
    });
}

// Add score for a team
function addTeamScore(eventId, activityId, teamId, scores) {
    return new Promise((resolve, reject) => {
        const events = fetchEvents();
        const event = events.find(e => e.id === eventId);
        
        if (!event) {
            reject('Event not found');
            return;
        }
        
        const activity = event.activities.find(a => a.id === activityId);
        if (!activity) {
            reject('Activity not found');
            return;
        }
        
        // Check if user is authorized to score
        const isCreator = event.creatorId === state.currentUser.id;
        const isActivityLeader = event.activityLeaders.some(
            al => al.userId === state.currentUser.id && al.activityId === activityId
        );
        
        if (!isCreator && !isActivityLeader) {
            reject('Not authorized to score this activity');
            return;
        }
        
        const scoreEntry = {
            teamId,
            scoredBy: state.currentUser.id,
            timestamp: new Date().toISOString(),
            scores
        };
        
        activity.scores.push(scoreEntry);
        localStorage.setItem('events', JSON.stringify(events));
        state.events = events;
        
        resolve(scoreEntry);
    });
}