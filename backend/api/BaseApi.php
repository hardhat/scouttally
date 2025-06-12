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
        // Simple token-based auth (in a real app, use JWT or similar)
        $headers = getallheaders();
        if (!isset($headers['Authorization'])) {
            return false;
        }
        
        $token = str_replace('Bearer ', '', $headers['Authorization']);
        
        // Validate token (simplified for example)
        $stmt = $this->conn->prepare("SELECT id FROM users WHERE id = ?");
        $userId = $this->getUserIdFromToken($token);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->num_rows > 0;
    }
    
    protected function getUserIdFromToken($token) {
        // In a real app, decode and validate JWT
        // This is a simplified example
        return intval($token);
    }
    
    protected function getCurrentUserId() {
        $headers = getallheaders();
        if (!isset($headers['Authorization'])) {
            return null;
        }
        
        $token = str_replace('Bearer ', '', $headers['Authorization']);
        return $this->getUserIdFromToken($token);
    }
}
?>