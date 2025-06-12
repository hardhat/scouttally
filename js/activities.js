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
                            <h3 class="card-title">Add Activity</h3>
                            <p class="mb-0 text-muted">Event: ${event.name}</p>
                        </div>
                        <div class="card-body">
                            <form id="add-activity-form">
                                <div class="mb-3">
                                    <label for="activity-name" class="form-label">Activity Name *</label>
                                    <input type="text" class="form-control" id="activity-name" required
                                           placeholder="e.g., Knot Tying, First Aid Challenge">
                                </div>

                                <div class="mb-3">
                                    <label for="activity-description" class="form-label">Description</label>
                                    <textarea class="form-control" id="activity-description" rows="3"
                                        placeholder="Describe the activity, rules, or objectives"></textarea>
                                </div>

                                <div class="mb-3">
                                    <label for="activity-date" class="form-label">Activity Date *</label>
                                    <input type="date" class="form-control" id="activity-date" required>
                                    <div class="form-text">
                                        Must be between ${new Date(event.start_date).toLocaleDateString()}
                                        and ${new Date(event.end_date).toLocaleDateString()}
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">Score Categories</label>
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
                                        + Add Score Category
                                    </button>
                                    <div class="form-text">
                                        Define how this activity will be scored (e.g., Speed: 10 points, Accuracy: 15 points)
                                    </div>
                                </div>

                                <div class="d-flex justify-content-between">
                                    <button type="button" class="btn btn-secondary" id="cancel-add-activity">Cancel</button>
                                    <button type="submit" class="btn btn-primary">Add Activity</button>
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
                ApiService.showNotification('Success', 'Activity added successfully!', 'success');
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

// More activity-related functions would be implemented here...

// Ensure functions are available globally
window.showAddActivityForm = showAddActivityForm;
