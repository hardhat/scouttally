// Show rankings page
function showRankingsPage() {
    mainContent.innerHTML = `
        <h2 class="mb-4">Rankings</h2>
        <div class="row">
            <div class="col-12">
                <div class="alert alert-info">
                    Rankings functionality coming soon! This will show event and overall rankings.
                </div>
            </div>
        </div>
    `;
}

// Calculate rankings for a specific event
function calculateEventRankings(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) return [];
    
    const teams = {};
    
    // Process all activities and their scores
    event.activities.forEach(activity => {
        activity.scores.forEach(score => {
            if (!teams[score.teamId]) {
                teams[score.teamId] = {
                    teamId: score.teamId,
                    totalScore: 0,
                    activityScores: {}
                };
            }
            
            // Sum up scores for each category
            let activityTotal = 0;
            score.scores.forEach(categoryScore => {
                activityTotal += categoryScore.value;
            });
            
            teams[score.teamId].activityScores[activity.id] = activityTotal;
            teams[score.teamId].totalScore += activityTotal;
        });
    });
    
    // Convert to array and sort by total score
    const rankings = Object.values(teams).sort((a, b) => b.totalScore - a.totalScore);
    
    // Add team details and rank
    return rankings.map((ranking, index) => {
        const team = state.teams.find(t => t.id === ranking.teamId) || { name: 'Unknown Team' };
        return {
            ...ranking,
            rank: index + 1,
            teamName: team.name
        };
    });
}

// Calculate overall rankings across all events
function calculateOverallRankings() {
    const teams = {};
    
    // Process all events
    state.events.forEach(event => {
        const eventRankings = calculateEventRankings(event.id);
        
        eventRankings.forEach(ranking => {
            if (!teams[ranking.teamId]) {
                teams[ranking.teamId] = {
                    teamId: ranking.teamId,
                    teamName: ranking.teamName,
                    totalScore: 0,
                    eventCount: 0
                };
            }
            
            teams[ranking.teamId].totalScore += ranking.totalScore;
            teams[ranking.teamId].eventCount += 1;
        });
    });
    
    // Convert to array and sort by total score
    const rankings = Object.values(teams).sort((a, b) => b.totalScore - a.totalScore);
    
    // Add rank
    return rankings.map((ranking, index) => ({
        ...ranking,
        rank: index + 1
    }));
}

// Ensure functions are available globally
window.showRankingsPage = showRankingsPage;