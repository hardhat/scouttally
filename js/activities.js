// Show add activity form
async function showAddActivityForm(eventId) {
    try {
        // Get event details to show context and validate date range
        const event = await ApiService.getEvent(eventId);

        mainContent.innerHTML = `
            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="bi bi-plus-circle me-2"></i>Add Activity</h3>
                            <p class="mb-0 text-muted"><i class="bi bi-calendar-event me-1"></i>Event: ${event.name}</p>
                        </div>
                        <div class="card-body">
                            <form id="add-activity-form">
                                <div class="mb-3">
                                    <label for="activity-name" class="form-label"><i class="bi bi-clipboard-check me-1"></i>Activity Name *</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-clipboard-check"></i></span>
                                        <input type="text" class="form-control" id="activity-name" required
                                               placeholder="e.g., Knot Tying, First Aid Challenge">
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="activity-description" class="form-label"><i class="bi bi-card-text me-1"></i>Description</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-card-text"></i></span>
                                        <textarea class="form-control" id="activity-description" rows="3"
                                            placeholder="Describe the activity, rules, or objectives"></textarea>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="activity-date" class="form-label"><i class="bi bi-calendar-date me-1"></i>Activity Date *</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-calendar-date"></i></span>
                                        <input type="date" class="form-control" id="activity-date" required>
                                    </div>
                                    <div class="form-text">
                                        <i class="bi bi-info-circle me-1"></i>Must be between ${new Date(event.start_date).toLocaleDateString()}
                                        and ${new Date(event.end_date).toLocaleDateString()}
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label"><i class="bi bi-award me-1"></i>Score Categories</label>
                                    <div id="score-categories">
                                        <div class="score-category-item mb-2">
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <input type="text" class="form-control category-name"
                                                           placeholder="Category name (e.g., Speed, Accuracy)" required>
                                                </div>
                                                <div class="col-md-4">
                                                    <input type="number" class="form-control category-max-score"
                                                           placeholder="Max score" min="1" max="100" value="10" required>
                                                </div>
                                                <div class="col-md-2">
                                                    <button type="button" class="btn btn-outline-danger btn-sm remove-category"
                                                            style="display: none;">×</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" class="btn btn-outline-primary btn-sm" id="add-category">
                                        <i class="bi bi-plus-circle me-1"></i>Add Score Category
                                    </button>
                                    <div class="form-text">
                                        Define how this activity will be scored (e.g., Speed: 10 points, Accuracy: 15 points)
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label"><i class="bi bi-people me-1"></i>Activity Leaders</label>
                                    <div id="activity-leaders" class="mb-2">
                                        <!-- Leaders will be added here -->
                                    </div>
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="leader-search" 
                                               placeholder="Search users by name or email">
                                        <button class="btn btn-outline-secondary" type="button" id="add-leader">
                                            <i class="bi bi-plus-circle me-1"></i>Add Leader
                                        </button>
                                    </div>
                                    <div id="leader-search-results" class="list-group mt-2" style="display: none;">
                                        <!-- Search results will appear here -->
                                    </div>
                                </div>

                                <div class="d-flex justify-content-between">
                                    <button type="button" class="btn btn-secondary" id="cancel-add-activity">
                                        <i class="bi bi-x-circle me-1"></i>Cancel
                                    </button>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-plus-circle me-1"></i>Add Activity
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Set date constraints based on event dates
        const activityDateInput = document.getElementById('activity-date');
        activityDateInput.min = event.start_date;
        activityDateInput.max = event.end_date;

        // Set default date to event start date
        activityDateInput.value = event.start_date;

        // Add category functionality
        let categoryCount = 1;

        document.getElementById('add-category').addEventListener('click', () => {
            categoryCount++;
            const categoriesContainer = document.getElementById('score-categories');
            const newCategory = document.createElement('div');
            newCategory.className = 'score-category-item mb-2';
            newCategory.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <input type="text" class="form-control category-name"
                               placeholder="Category name" required>
                    </div>
                    <div class="col-md-4">
                        <input type="number" class="form-control category-max-score"
                               placeholder="Max score" min="1" max="100" value="10" required>
                    </div>
                    <div class="col-md-2">
                        <button type="button" class="btn btn-outline-danger btn-sm remove-category">×</button>
                    </div>
                </div>
            `;
            categoriesContainer.appendChild(newCategory);

            // Show remove buttons when there's more than one category
            updateRemoveButtons();
        });

        // Remove category functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-category')) {
                e.target.closest('.score-category-item').remove();
                categoryCount--;
                updateRemoveButtons();
            }
        });

        function updateRemoveButtons() {
            const removeButtons = document.querySelectorAll('.remove-category');
            removeButtons.forEach(button => {
                button.style.display = categoryCount > 1 ? 'block' : 'none';
            });
        }

        // Cancel button
        document.getElementById('cancel-add-activity').addEventListener('click', () => {
            window.showEventDetails(eventId);
        });

        // Activity leader management
        const selectedLeaders = new Set();
        const leaderSearchInput = document.getElementById('leader-search');
        const leaderSearchResults = document.getElementById('leader-search-results');
        const activityLeaders = document.getElementById('activity-leaders');

        let searchTimeout;
        leaderSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = leaderSearchInput.value.trim();
            
            if (query.length < 2) {
                leaderSearchResults.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const users = await ApiService.searchUsers(query);
                    leaderSearchResults.innerHTML = users
                        .filter(user => !selectedLeaders.has(user.id))
                        .map(user => `
                            <button type="button" class="list-group-item list-group-item-action"
                                    data-user-id="${user.id}" data-user-name="${user.name}">
                                <i class="bi bi-person me-2"></i>${user.name} (${user.email})
                            </button>
                        `).join('');
                    leaderSearchResults.style.display = users.length > 0 ? 'block' : 'none';
                } catch (error) {
                    console.error('Error searching users:', error);
                }
            }, 300);
        });

        leaderSearchResults.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const userId = button.dataset.userId;
            const userName = button.dataset.userName;

            if (!selectedLeaders.has(userId)) {
                selectedLeaders.add(userId);
                const leaderElement = document.createElement('div');
                leaderElement.className = 'selected-leader d-flex align-items-center mb-2';
                leaderElement.innerHTML = `
                    <span class="me-2"><i class="bi bi-person-check"></i> ${userName}</span>
                    <button type="button" class="btn btn-outline-danger btn-sm" data-user-id="${userId}">
                        <i class="bi bi-x"></i>
                    </button>
                `;
                activityLeaders.appendChild(leaderElement);
                leaderSearchInput.value = '';
                leaderSearchResults.style.display = 'none';
            }
        });

        activityLeaders.addEventListener('click', (e) => {
            const removeButton = e.target.closest('button');
            if (!removeButton) return;

            const userId = removeButton.dataset.userId;
            selectedLeaders.delete(userId);
            removeButton.closest('.selected-leader').remove();
        });

        // Form submission
        document.getElementById('add-activity-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('activity-name').value.trim();
            const description = document.getElementById('activity-description').value.trim();
            const activityDate = document.getElementById('activity-date').value;

            // Collect score categories
            const categoryNames = document.querySelectorAll('.category-name');
            const categoryMaxScores = document.querySelectorAll('.category-max-score');
            const scoreCategories = [];

            for (let i = 0; i < categoryNames.length; i++) {
                const categoryName = categoryNames[i].value.trim();
                const maxScore = parseInt(categoryMaxScores[i].value);

                if (categoryName && maxScore > 0) {
                    scoreCategories.push({
                        name: categoryName,
                        max_score: maxScore,
                        weight: 1.0
                    });
                }
            }

            // Validation
            if (!name) {
                ApiService.showNotification('Error', 'Activity name is required', 'error');
                return;
            }

            if (!activityDate) {
                ApiService.showNotification('Error', 'Activity date is required', 'error');
                return;
            }

            if (scoreCategories.length === 0) {
                ApiService.showNotification('Error', 'At least one score category is required', 'error');
                return;
            }

            // Validate date is within event range
            const activityDateObj = new Date(activityDate);
            const eventStartObj = new Date(event.start_date);
            const eventEndObj = new Date(event.end_date);

            if (activityDateObj < eventStartObj || activityDateObj > eventEndObj) {
                ApiService.showNotification('Error', 'Activity date must be within the event date range', 'error');
                return;
            }

            try {
                const activityData = {
                    event_id: eventId,
                    name: name,
                    description: description,
                    activity_date: activityDate,
                    score_categories: scoreCategories
                };

                const newActivity = await ApiService.createActivity(activityData);
                
                // Assign selected leaders
                const leaderPromises = Array.from(selectedLeaders).map(userId => 
                    ApiService.assignActivityLeader(newActivity.id, userId)
                );
                
                await Promise.all(leaderPromises);
                
                ApiService.showNotification('Success', 'Activity and leaders added successfully!', 'success');
                window.showEventDetails(eventId);
            } catch (error) {
                // Error is already handled by the API service
            }
        });

    } catch (error) {
        console.error('Error loading event for activity creation:', error);
        ApiService.showNotification('Error', 'Failed to load event details', 'error');
        window.showEventsPage();
    }
}

// Show edit activity form
async function showEditActivityForm(activityId) {
    try {
        const activity = await ApiService.getActivity(activityId);
        const event = activity.event; // Event info is now included in activity response
        const currentLeaders = activity.leaders; // Leaders are now included in activity response

        mainContent.innerHTML = `
            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="bi bi-pencil-square me-2"></i>Edit Activity</h3>
                            <p class="mb-0 text-muted"><i class="bi bi-calendar-event me-1"></i>Event: ${event.name}</p>
                        </div>
                        <div class="card-body">
                            <form id="edit-activity-form">
                                <div class="mb-3">
                                    <label for="activity-name" class="form-label">
                                        <i class="bi bi-clipboard-check me-1"></i>Activity Name *
                                    </label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-clipboard-check"></i></span>
                                        <input type="text" class="form-control" id="activity-name" required
                                               value="${activity.name}">
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="activity-description" class="form-label">
                                        <i class="bi bi-card-text me-1"></i>Description
                                    </label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-card-text"></i></span>
                                        <textarea class="form-control" id="activity-description" rows="3">${activity.description || ''}</textarea>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="activity-date" class="form-label">
                                        <i class="bi bi-calendar-date me-1"></i>Activity Date *
                                    </label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-calendar-date"></i></span>
                                        <input type="date" class="form-control" id="activity-date" required
                                               value="${activity.activity_date}">
                                    </div>
                                    <div class="form-text">
                                        Must be between ${new Date(event.start_date).toLocaleDateString()}
                                        and ${new Date(event.end_date).toLocaleDateString()}
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">
                                        <i class="bi bi-people me-1"></i>Activity Leaders
                                    </label>
                                    <div id="activity-leaders" class="mb-2">
                                        <!-- Existing leaders will be added here -->
                                    </div>
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="leader-search" 
                                               placeholder="Search users by name or email">
                                        <button class="btn btn-outline-secondary" type="button" id="add-leader">
                                            <i class="bi bi-plus-circle me-1"></i>Add Leader
                                        </button>
                                    </div>
                                    <div id="leader-search-results" class="list-group mt-2" style="display: none;">
                                        <!-- Search results will appear here -->
                                    </div>
                                </div>

                                <div class="d-flex justify-content-between">
                                    <button type="button" class="btn btn-secondary" id="cancel-edit-activity">
                                        <i class="bi bi-x-circle me-1"></i>Cancel
                                    </button>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-save me-1"></i>Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Set date constraints
        const activityDateInput = document.getElementById('activity-date');
        activityDateInput.min = event.start_date;
        activityDateInput.max = event.end_date;

        // Initialize leaders management
        const selectedLeaders = new Set();
        const leaderSearchInput = document.getElementById('leader-search');
        const leaderSearchResults = document.getElementById('leader-search-results');
        const activityLeadersContainer = document.getElementById('activity-leaders');

        // Add existing leaders
        currentLeaders.forEach(leader => {
            selectedLeaders.add(leader.user_id.toString());
            const leaderElement = document.createElement('div');
            leaderElement.className = 'selected-leader d-flex align-items-center mb-2';
            leaderElement.innerHTML = `
                <span class="me-2"><i class="bi bi-person-check"></i> ${leader.name}</span>
                <button type="button" class="btn btn-outline-danger btn-sm" 
                        data-leader-id="${leader.id}" data-user-id="${leader.user_id}">
                    <i class="bi bi-x"></i>
                </button>
            `;
            activityLeadersContainer.appendChild(leaderElement);
        });

        // Leader search functionality
        let searchTimeout;
        leaderSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = leaderSearchInput.value.trim();
            
            if (query.length < 2) {
                leaderSearchResults.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const users = await ApiService.searchUsers(query);
                    leaderSearchResults.innerHTML = users
                        .filter(user => !selectedLeaders.has(user.id.toString()))
                        .map(user => `
                            <button type="button" class="list-group-item list-group-item-action"
                                    data-user-id="${user.id}" data-user-name="${user.name}">
                                <i class="bi bi-person me-2"></i>${user.name} (${user.email})
                            </button>
                        `).join('');
                    leaderSearchResults.style.display = users.length > 0 ? 'block' : 'none';
                } catch (error) {
                    console.error('Error searching users:', error);
                }
            }, 300);
        });

        // Add new leader
        leaderSearchResults.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const userId = button.dataset.userId;
            const userName = button.dataset.userName;

            try {
                // Assign the new leader
                const result = await ApiService.assignActivityLeader(activityId, userId);
                
                selectedLeaders.add(userId);
                const leaderElement = document.createElement('div');
                leaderElement.className = 'selected-leader d-flex align-items-center mb-2';
                leaderElement.innerHTML = `
                    <span class="me-2"><i class="bi bi-person-check"></i> ${userName}</span>
                    <button type="button" class="btn btn-outline-danger btn-sm" 
                            data-leader-id="${result.id}" data-user-id="${userId}">
                        <i class="bi bi-x"></i>
                    </button>
                `;
                activityLeadersContainer.appendChild(leaderElement);
                leaderSearchInput.value = '';
                leaderSearchResults.style.display = 'none';

                ApiService.showNotification('Success', 'Leader added successfully', 'success');
            } catch (error) {
                console.error('Error adding leader:', error);
            }
        });

        // Remove leader
        activityLeadersContainer.addEventListener('click', async (e) => {
            const removeButton = e.target.closest('button');
            if (!removeButton) return;

            const leaderId = removeButton.dataset.leaderId;
            const userId = removeButton.dataset.userId;

            try {
                await ApiService.removeActivityLeader(leaderId);
                selectedLeaders.delete(userId);
                removeButton.closest('.selected-leader').remove();
                ApiService.showNotification('Success', 'Leader removed successfully', 'success');
            } catch (error) {
                console.error('Error removing leader:', error);
            }
        });

        // Form submission
        document.getElementById('edit-activity-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('activity-name').value.trim();
            const description = document.getElementById('activity-description').value.trim();
            const activityDate = document.getElementById('activity-date').value;

            // Validation
            if (!name) {
                ApiService.showNotification('Error', 'Activity name is required', 'error');
                return;
            }

            if (!activityDate) {
                ApiService.showNotification('Error', 'Activity date is required', 'error');
                return;
            }

            // Validate date is within event range
            const activityDateObj = new Date(activityDate);
            const eventStartObj = new Date(event.start_date);
            const eventEndObj = new Date(event.end_date);

            if (activityDateObj < eventStartObj || activityDateObj > eventEndObj) {
                ApiService.showNotification('Error', 'Activity date must be within the event date range', 'error');
                return;
            }

            try {
                const activityData = {
                    name: name,
                    description: description,
                    activity_date: activityDate
                };

                await ApiService.updateActivity(activityId, activityData);
                ApiService.showNotification('Success', 'Activity updated successfully!', 'success');
                window.showEventDetails(event.id);
            } catch (error) {
                // Error is already handled by the API service
            }
        });

        // Cancel button
        document.getElementById('cancel-edit-activity').addEventListener('click', () => {
            window.showEventDetails(event.id);
        });

    } catch (error) {
        console.error('Error loading activity for editing:', error);
        ApiService.showNotification('Error', 'Failed to load activity details', 'error');
    }
}

// More activity-related functions would be implemented here...

// Ensure functions are available globally
window.showAddActivityForm = showAddActivityForm;
window.showEditActivityForm = showEditActivityForm;
