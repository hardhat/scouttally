# Environment Configuration

## Setup Instructions

1. **Copy the template file:**
   ```bash
   cp env.template.php env.php
   ```

2. **Edit env.php with your actual values:**
   - Update database credentials
   - Set secure JWT secret key
   - Configure other settings as needed

3. **Security Notes:**
   - `env.php` is ignored by git and will not be committed
   - Never commit sensitive credentials to version control
   - Use strong, unique passwords and secret keys
   - In production, consider using environment variables instead

## Configuration Options

### Database Settings
- `DB_HOST`: Database server hostname
- `DB_USER`: Database username
- `DB_PASS`: Database password
- `DB_NAME`: Database name

### Application Settings
- `APP_ENV`: Environment (development, production, testing)
- `APP_DEBUG`: Enable/disable debug mode

### Security Settings
- `JWT_SECRET`: Secret key for JWT token generation
- `ENCRYPTION_KEY`: Key for data encryption (32 characters recommended)

### Email Settings (Future Use)
- `MAIL_HOST`: SMTP server hostname
- `MAIL_PORT`: SMTP server port
- `MAIL_USERNAME`: SMTP username
- `MAIL_PASSWORD`: SMTP password
- `MAIL_FROM_ADDRESS`: Default sender email
- `MAIL_FROM_NAME`: Default sender name

### API Settings
- `API_RATE_LIMIT`: Requests per minute limit
- `SESSION_TIMEOUT`: Session timeout in seconds

## Production Deployment

For production environments, consider:
1. Using environment variables instead of PHP files
2. Setting `APP_DEBUG` to `false`
3. Using strong, randomly generated secret keys
4. Enabling HTTPS
5. Setting appropriate file permissions (600 for env.php)
