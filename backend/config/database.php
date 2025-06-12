<?php
// Load environment configuration
$envFile = __DIR__ . '/env.php';
if (file_exists($envFile)) {
    require_once $envFile;
} else {
    // Fallback to default values if env.php doesn't exist
    define('DB_HOST', 'localhost');
    define('DB_USER', 'event_scoring_user');
    define('DB_PASS', 'f#o5edGsggEpf');
    define('DB_NAME', 'event_scoring');

    // Show warning in development
    if (php_sapi_name() !== 'cli') {
        error_log('Warning: env.php file not found. Using default database configuration.');
    }
}

class Database {
    private $host = DB_HOST;
    private $username = DB_USER;
    private $password = DB_PASS;
    private $database = DB_NAME;
    private $connection;

    public function getConnection() {
        $this->connection = null;

        try {
            $this->connection = new mysqli($this->host, $this->username, $this->password, $this->database);

            if ($this->connection->connect_error) {
                throw new Exception("Connection failed: " . $this->connection->connect_error);
            }

            $this->connection->set_charset("utf8");
        } catch (Exception $e) {
            echo "Database connection error: " . $e->getMessage();
        }

        return $this->connection;
    }
}

// Legacy function for backward compatibility
function getDbConnection() {
    $database = new Database();
    return $database->getConnection();
}
?>