// User registration function
async function registerUser(userData) {
    try {
        const result = await ApiService.register(userData);
        // Store user in session storage
        sessionStorage.setItem('currentUser', JSON.stringify(result));
        state.currentUser = result;
        ApiService.showNotification('Success', 'Registration successful!', 'success');
        return result;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

// User login function
async function loginUser(credentials) {
    try {
        const result = await ApiService.login(credentials);
        // Store user in session storage
        sessionStorage.setItem('currentUser', JSON.stringify(result));
        state.currentUser = result;
        ApiService.showNotification('Success', 'Login successful!', 'success');
        return result;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Logout function
function logout() {
    sessionStorage.removeItem('currentUser');
    state.currentUser = null;
    updateNavigation(false);
    showHomePage();
    ApiService.showNotification('Info', 'You have been logged out');
}

// Show login form
function showLoginForm() {
    mainContent.innerHTML = `
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-4">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Login</h3>
                    </div>
                    <div class="card-body">
                        <form id="login-form">
                            <div class="mb-3">
                                <label for="email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="email" required>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">Password</label>
                                <input type="password" class="form-control" id="password" required>
                            </div>
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary">Login</button>
                            </div>
                        </form>
                    </div>
                    <div class="card-footer text-center">
                        <p class="mb-0">Don't have an account? <a href="#" id="show-register">Register</a></p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('show-register').addEventListener('click', showRegistrationForm);
    
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            await loginUser({ email, password });
            updateNavigation(true);
            showHomePage();
        } catch (error) {
            // Error is already handled by the API service
        }
    });
}

// Show registration form
function showRegistrationForm() {
    mainContent.innerHTML = `
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-4">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Register</h3>
                    </div>
                    <div class="card-body">
                        <form id="register-form">
                            <div class="mb-3">
                                <label for="name" class="form-label">Name</label>
                                <input type="text" class="form-control" id="name" required>
                            </div>
                            <div class="mb-3">
                                <label for="email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="email" required>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">Password</label>
                                <input type="password" class="form-control" id="password" required>
                            </div>
                            <div class="mb-3">
                                <label for="confirm-password" class="form-label">Confirm Password</label>
                                <input type="password" class="form-control" id="confirm-password" required>
                            </div>
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary">Register</button>
                            </div>
                        </form>
                    </div>
                    <div class="card-footer text-center">
                        <p class="mb-0">Already have an account? <a href="#" id="show-login">Login</a></p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('show-login').addEventListener('click', showLoginForm);
    
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (password !== confirmPassword) {
            ApiService.showNotification('Error', 'Passwords do not match', 'error');
            return;
        }
        
        try {
            await registerUser({ name, email, password });
            updateNavigation(true);
            showHomePage();
        } catch (error) {
            // Error is already handled by the API service
        }
    });
}

// Ensure functions are available globally
window.showLoginForm = showLoginForm;
window.showRegistrationForm = showRegistrationForm;
window.logout = logout;
