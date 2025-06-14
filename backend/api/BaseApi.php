<?php
class BaseApi {
    protected $conn;
    protected $requestMethod;
    protected $params;
    
    // List of endpoints that don't require authentication
    protected static $noAuthEndpoints = [
        'user.php' => ['login', 'register']
    ];

    public function __construct($db) {
        $this->conn = $db;
        $this->requestMethod = $_SERVER["REQUEST_METHOD"];
        $this->params = $this->getRequestParams();
    }
    
    protected function getRequestParams() {
        // Get URL query parameters
        $queryParams = [];
        if (isset($_SERVER['QUERY_STRING'])) {
            parse_str($_SERVER['QUERY_STRING'], $queryParams);
        }
        
        // Get JSON body for POST, PUT requests
        $jsonParams = [];
        if (in_array($this->requestMethod, ['POST', 'PUT'])) {
            $json = file_get_contents('php://input');
            if (!empty($json)) {
                $jsonParams = json_decode($json, true) ?? [];
            }
        }
        
        // Also include POST parameters
        $postParams = $_POST ?? [];
        
        return array_merge($queryParams, $postParams, $jsonParams);
    }
    
    protected function sendResponse($data, $statusCode = 200) {
        header('Content-Type: application/json');
        http_response_code($statusCode);
        echo json_encode($data);
    }
    
    protected function sendError($message, $statusCode = 400) {
        $this->sendResponse(['error' => $message], $statusCode);
    }
    
    protected function validateRequiredParams($required) {
        $missing = [];
        foreach ($required as $param) {
            if (!isset($this->params[$param]) || empty($this->params[$param])) {
                $missing[] = $param;
            }
        }
        
        if (!empty($missing)) {
            error_log("Missing parameters: " . implode(', ', $missing));
            error_log("Available parameters: " . print_r($this->params, true));
            $this->sendError("Missing required parameters: " . implode(', ', $missing));
            return false;
        }
        return true;
    }
    
    protected function requiresAuth() {
        // Get the script name from the request path
        $scriptName = basename($_SERVER['SCRIPT_NAME']);
        // Get the action from either POST data or query parameters
        $action = isset($this->params['action']) ? $this->params['action'] : '';
        
        // Check if this endpoint is in the no-auth list
        $requiresAuth = !(
            isset(self::$noAuthEndpoints[$scriptName]) &&
            in_array($action, self::$noAuthEndpoints[$scriptName])
        );

        error_log("Auth check for $scriptName with action '$action': " . ($requiresAuth ? 'requires auth' : 'no auth required'));
        return $requiresAuth;
    }

    protected function isAuthorized() {
        // First check if this endpoint requires authentication
        if (!$this->requiresAuth()) {
            error_log("Skipping auth check for non-auth endpoint");
            return true;
        }

        $headers = getallheaders();
        if (!isset($headers['Authorization'])) {
            $this->sendError("Authorization header is missing", 401);
            return false;
        }

        $auth = $headers['Authorization'];
        if (!str_starts_with($auth, 'Bearer ')) {
            $this->sendError("Invalid authorization format", 401);
            return false;
        }

        $token = substr($auth, 7); // Remove 'Bearer ' prefix
        return $this->validateToken($token);
    }

    protected function validateToken($token) {
        try {
            $decoded = base64_decode($token);
            if ($decoded === false) {
                error_log("Token validation failed: base64 decode failed");
                $this->sendError("Invalid token format", 401);
                return false;
            }

            $parts = explode('.', $decoded);
            if (count($parts) !== 2) {
                error_log("Token validation failed: invalid token format");
                $this->sendError("Invalid token format", 401);
                return false;
            }

            $payload = json_decode($parts[0], true);
            if (!$payload || !isset($payload['user_id']) || !isset($payload['expires_at'])) {
                error_log("Token validation failed: missing required payload fields");
                error_log("Payload: " . print_r($payload, true));
                $this->sendError("Invalid token format", 401);
                return false;
            }

            // Check if token has expired
            if ($payload['expires_at'] < time()) {
                error_log("Token expired at " . date('Y-m-d H:i:s', $payload['expires_at']));
                error_log("Current time: " . date('Y-m-d H:i:s', time()));
                $this->sendError("Session expired. Please log in again.", 401);
                return false;
            }

            // Verify signature
            $secret = defined('JWT_SECRET') ? JWT_SECRET : 'default_secret_change_this';
            $expectedHash = hash_hmac('sha256', $parts[0], $secret);
            if (!hash_equals($expectedHash, $parts[1])) {
                error_log("Token validation failed: invalid signature");
                $this->sendError("Invalid token", 401);
                return false;
            }

            // Check if user exists and is active
            $stmt = $this->conn->prepare("SELECT id FROM users WHERE id = ?");
            $stmt->bind_param("i", $payload['user_id']);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows === 0) {
                error_log("Token validation failed: user {$payload['user_id']} not found");
                return false;
            }
            return true;
        } catch (Exception $e) {
            error_log("Token validation failed with exception: " . $e->getMessage());
            return false;
        }
    }
    
    protected function getUserIdFromToken($token) {
        try {
            $decoded = base64_decode($token);
            if ($decoded === false) {
                return null;
            }

            $parts = explode('.', $decoded);
            if (count($parts) !== 2) {
                return null;
            }

            $payload = json_decode($parts[0], true);
            if (!$payload || !isset($payload['user_id'])) {
                return null;
            }

            return $payload['user_id'];
        } catch (Exception $e) {
            return null;
        }
    }
    
    protected function getCurrentUserId() {
        $headers = getallheaders();
        if (!isset($headers['Authorization'])) {
            return null;
        }
        
        $auth = $headers['Authorization'];
        if (!str_starts_with($auth, 'Bearer ')) {
            return null;
        }

        $token = substr($auth, 7); // Remove 'Bearer ' prefix
        return $this->getUserIdFromToken($token);
    }
}
?>