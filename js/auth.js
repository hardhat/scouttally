// User registration function
async function registerUser(userData) {
    try {
        console.log('Attempting to register user:', { ...userData, password: '[REDACTED]' });
        const result = await ApiService.register(userData);
        console.log('Registration successful:', { ...result, token: '[REDACTED]' });
        // Store user in session storage
        sessionStorage.setItem('currentUser', JSON.stringify(result));
        state.currentUser = result;
        ApiService.showNotification('Success', 'Registration successful!', 'success');
        return result;
    } catch (error) {
        console.error('Registration error:', error);
        // Don't show session expired for registration
        if (error.message === 'Session expired') {
            return ApiService.register(userData);
        }
        throw error;
    }
}

// User login function
async function loginUser(credentials) {
    try {
        console.log('Attempting to login user:', { ...credentials, password: '[REDACTED]' });
        const result = await ApiService.login(credentials);
        console.log('Login successful:', { ...result, token: '[REDACTED]' });
        // Store user in session storage
        sessionStorage.setItem('currentUser', JSON.stringify(result));
        state.currentUser = result;
        ApiService.showNotification('Success', 'Login successful!', 'success');
        return result;
    } catch (error) {
        console.error('Login error:', error);
        // Don't show session expired for login
        if (error.message === 'Session expired') {
            return ApiService.login(credentials);
        }
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
                        <h3 class="card-title"><i class="bi bi-box-arrow-in-right me-2"></i>Login</h3>
                    </div>
                    <div class="card-body">
                        <form id="login-form">
                            <div class="mb-3">
                                <label for="email" class="form-label"><i class="bi bi-envelope me-1"></i>Email</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                                    <input type="email" class="form-control" id="email" required placeholder="Enter your email">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label"><i class="bi bi-lock me-1"></i>Password</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-lock"></i></span>
                                    <input type="password" class="form-control" id="password" required placeholder="Enter your password">
                                </div>
                            </div>
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-box-arrow-in-right me-2"></i>Login
                                </button>
                            </div>
                        </form>
                    </div>
                    <div class="card-footer text-center">
                        <p class="mb-0">Don't have an account? <a href="#" id="show-register"><i class="bi bi-person-plus me-1"></i>Register</a></p>
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
                        <h3 class="card-title"><i class="bi bi-person-plus me-2"></i>Register</h3>
                    </div>
                    <div class="card-body">
                        <form id="register-form">
                            <div class="mb-3">
                                <label for="name" class="form-label"><i class="bi bi-person me-1"></i>Name</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-person"></i></span>
                                    <input type="text" class="form-control" id="name" required placeholder="Enter your full name">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="email" class="form-label"><i class="bi bi-envelope me-1"></i>Email</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                                    <input type="email" class="form-control" id="email" required placeholder="Enter your email">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label"><i class="bi bi-lock me-1"></i>Password</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-lock"></i></span>
                                    <input type="password" class="form-control" id="password" required placeholder="Create a password">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="confirm-password" class="form-label"><i class="bi bi-lock-fill me-1"></i>Confirm Password</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-lock-fill"></i></span>
                                    <input type="password" class="form-control" id="confirm-password" required placeholder="Confirm your password">
                                </div>
                            </div>
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-person-plus me-2"></i>Register
                                </button>
                            </div>
                        </form>
                    </div>
                    <div class="card-footer text-center">
                        <p class="mb-0">Already have an account? <a href="#" id="show-login"><i class="bi bi-box-arrow-in-right me-1"></i>Login</a></p>
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
