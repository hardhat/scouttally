<?php
class BaseApi {
    protected $conn;
    protected $requestMethod;
    protected $params;
    
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
        
        return array_merge($queryParams, $jsonParams);
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
        foreach ($required as $param) {
            if (!isset($this->params[$param]) || empty($this->params[$param])) {
                $this->sendError("Missing required parameter: $param");
                return false;
            }
        }
        return true;
    }
    
    protected function isAuthorized() {
        $headers = getallheaders();
        if (!isset($headers['Authorization'])) {
            return false;
        }

        $auth = $headers['Authorization'];
        if (!str_starts_with($auth, 'Bearer ')) {
            return false;
        }

        $token = substr($auth, 7); // Remove 'Bearer ' prefix
        return $this->validateToken($token);
    }

    protected function validateToken($token) {
        try {
            $decoded = base64_decode($token);
            if ($decoded === false) {
                return false;
            }

            $parts = explode('.', $decoded);
            if (count($parts) !== 2) {
                return false;
            }

            $payload = json_decode($parts[0], true);
            if (!$payload || !isset($payload['user_id']) || !isset($payload['expires_at'])) {
                return false;
            }

            // Check if token has expired
            if ($payload['expires_at'] < time()) {
                return false;
            }

            // Verify signature
            $secret = defined('JWT_SECRET') ? JWT_SECRET : 'default_secret_change_this';
            $expectedHash = hash_hmac('sha256', $parts[0], $secret);
            if (!hash_equals($expectedHash, $parts[1])) {
                return false;
            }

            // Check if user exists and is active
            $stmt = $this->conn->prepare("SELECT id FROM users WHERE id = ?");
            $stmt->bind_param("i", $payload['user_id']);
            $stmt->execute();
            $result = $stmt->get_result();
            return $result->num_rows > 0;
        } catch (Exception $e) {
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