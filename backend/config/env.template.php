<?php
/**
 * Environment Configuration Template
 * 
 * Copy this file to env.php and update with your actual values
 * DO NOT commit env.php to version control
 */

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'your_database_username');
define('DB_PASS', 'your_database_password');
define('DB_NAME', 'event_scoring');

// Application settings
define('APP_ENV', 'development'); // development, production, testing
define('APP_DEBUG', true);

// Security settings
define('JWT_SECRET', 'your_jwt_secret_key_here');
define('ENCRYPTION_KEY', 'your_encryption_key_here');

// Email settings (if needed later)
define('MAIL_HOST', 'your_mail_host');
define('MAIL_PORT', 587);
define('MAIL_USERNAME', 'your_email_username');
define('MAIL_PASSWORD', 'your_email_password');
define('MAIL_FROM_ADDRESS', 'noreply@yourdomain.com');
define('MAIL_FROM_NAME', 'EventScore App');

// API settings
define('API_RATE_LIMIT', 100); // requests per minute
define('SESSION_TIMEOUT', 3600); // seconds

?>
