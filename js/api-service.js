// API Service for communicating with the backend
const ApiService = {
    // Base URL for API endpoints
    baseUrl: 'backend/api',
    
    // Get auth token from session storage
    getToken() {
        const user = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        return user ? user.token : null;
    },
    
    // Set auth headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    },
    
    // Generic fetch method with error handling
    async fetchApi(endpoint, method = 'GET', data = null) {
        // Show loading spinner
        document.getElementById('loading-spinner').classList.remove('d-none');
        
        try {
            const url = `${this.baseUrl}/${endpoint}`;
            const options = {
                method,
                headers: this.getHeaders()
            };
            
            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'An error occurred');
            }
            
            return result;
        } catch (error) {
            this.showNotification('Error', error.message, 'error');
            throw error;
        } finally {
            // Hide loading spinner
            document.getElementById('loading-spinner').classList.add('d-none');
        }
    },
    
    // Show notification toast
    showNotification(title, message, type = 'info') {
        const toast = document.getElementById('toast-notification');
        const toastTitle = document.getElementById('toast-title');
        const toastMessage = document.getElementById('toast-message');
        
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        // Set toast color based on type
        toast.classList.remove('bg-success', 'bg-danger', 'bg-info');
        if (type === 'success') {
            toast.classList.add('bg-success', 'text-white');
        } else if (type === 'error') {
            toast.classList.add('bg-danger', 'text-white');
        } else {
            toast.classList.add('bg-info', 'text-white');
        }
        
        // Show the toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    },
    
    // User API endpoints
    async register(userData) {
        return this.fetchApi('user.php', 'POST', {
            action: 'register',
            ...userData
        });
    },
    
    async login(credentials) {
        return this.fetchApi('user.php', 'POST', {
            action: 'login',
            ...credentials
        });
    },
    
    // Event API endpoints
    async getEvents() {
        return this.fetchApi('event.php');
    },
    
    async getEvent(id) {
        return this.fetchApi(`event.php?id=${id}`);
    },
    
    async createEvent(eventData) {
        return this.fetchApi('event.php', 'POST', eventData);
    },
    
    async updateEvent(id, eventData) {
        return this.fetchApi(`event.php?id=${id}`, 'PUT', eventData);
    },
    
    async deleteEvent(id) {
        return this.fetchApi(`event.php?id=${id}`, 'DELETE');
    },
    
    // Activity API endpoints
    async getActivity(id) {
        return this.fetchApi(`activity.php?id=${id}`);
    },
    
    async createActivity(activityData) {
        return this.fetchApi('activity.php', 'POST', activityData);
    },
    
    async updateActivity(id, activityData) {
        return this.fetchApi(`activity.php?id=${id}`, 'PUT', activityData);
    },
    
    async deleteActivity(id) {
        return this.fetchApi(`activity.php?id=${id}`, 'DELETE');
    },
    
    // Team API endpoints
    async getTeams() {
        return this.fetchApi('team.php');
    },
    
    async createTeam(teamData) {
        return this.fetchApi('team.php', 'POST', teamData);
    },
    
    // Score API endpoints
    async addScore(scoreData) {
        return this.fetchApi('score.php', 'POST', scoreData);
    },
    
    async getEventRankings(eventId) {
        return this.fetchApi(`rankings.php?event_id=${eventId}`);
    },
    
    async getOverallRankings() {
        return this.fetchApi('rankings.php');
    },
    
    // Activity leader management
    async getActivityLeaders(activityId) {
        return await this.fetchApi(`activity_leader.php?activity_id=${activityId}`);
    },

    async assignActivityLeader(activityId, userId) {
        return await this.fetchApi('activity_leader.php', 'POST', {
            activity_id: activityId,
            user_id: userId
        });
    },

    async removeActivityLeader(leaderId) {
        return await this.fetchApi(`activity_leader.php?id=${leaderId}`, 'DELETE');
    },

    // Search users (for leader assignment)
    async searchUsers(query) {
        return await this.fetchApi(`user.php?search=${encodeURIComponent(query)}`);
    }
};