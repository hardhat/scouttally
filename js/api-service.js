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
    getHeaders(endpoint) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Only add auth header for endpoints that require it
        if (this.requiresAuth(endpoint)) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        return headers;
    },
    
    // List of endpoints that don't require authentication
    noAuthEndpoints: ['user.php'],

    // Check if endpoint requires authentication
    requiresAuth(endpoint) {
        // Check if the endpoint is in the noAuthEndpoints list
        const isNoAuthEndpoint = this.noAuthEndpoints.some(noAuthPath => endpoint.startsWith(noAuthPath));
        
        // If it's a user.php endpoint, check if it's a login or register action
        if (isNoAuthEndpoint && endpoint.startsWith('user.php')) {
            const params = new URLSearchParams(endpoint.split('?')[1]);
            const action = params.get('action');
            return !(action === 'login' || action === 'register');
        }
        
        return !isNoAuthEndpoint;
    },

    // Check if token is expired
    isTokenExpired() {
        const user = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (!user || !user.token) return true;

        try {
            const tokenParts = atob(user.token).split('.');
            if (tokenParts.length !== 2) return true;

            const payload = JSON.parse(tokenParts[0]);
            return !payload.expires_at || payload.expires_at < Math.floor(Date.now() / 1000);
        } catch (error) {
            console.error('Error checking token expiration:', error);
            return true;
        }
    },

    // Handle expired token
    handleExpiredToken() {
        sessionStorage.removeItem('currentUser');
        // Only redirect to login if we're not already on login/register page and this isn't a login/register request
        const isAuthPage = window.location.hash === '#login' || window.location.hash === '#register';
        if (!isAuthPage) {
            window.location.href = '/#login';
            this.showNotification('Session Expired', 'Please log in again.', 'warning');
        }
    },

    // Generic fetch method with error handling
    async fetchApi(endpoint, method = 'GET', data = null) {
        // For POST requests to user endpoints (login/register), skip token check
        const isAuthEndpoint = endpoint === 'user.php' && method === 'POST' && 
            data && ['login', 'register'].includes(data.action);

        // Only check token expiration for endpoints that require authentication
        if (!isAuthEndpoint && this.requiresAuth(endpoint)) {
            if (this.isTokenExpired()) {
                this.handleExpiredToken();
                throw new Error('Session expired');
            }
        }

        // Show loading spinner
        document.getElementById('loading-spinner').classList.remove('d-none');
        
        try {
            const url = `${this.baseUrl}/${endpoint}`;
            const options = {
                method,
                headers: this.getHeaders(endpoint)
            };
            
            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (!response.ok) {
                console.error('API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    result
                });
                throw new Error(result.error || 'An error occurred');
            }
            
            return result;
        } catch (error) {
            console.error('Request Error:', error);
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
    async createActivity(activityData) {
        return this.fetchApi('activity.php', 'POST', activityData);
    },
    
    async updateActivity(activityId, activityData) {
        return await this.fetchApi(`activity.php?id=${activityId}`, 'PUT', activityData);
    },

    async getActivity(activityId) {
        return await this.fetchApi(`activity.php?id=${activityId}`);
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