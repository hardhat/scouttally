<?php
require_once 'BaseApi.php';

class UserApi extends BaseApi {
    public function processRequest() {
        switch ($this->requestMethod) {
            case 'POST':
                if (isset($this->params['action'])) {
                    if ($this->params['action'] === 'register') {
                        $this->registerUser();
                    } elseif ($this->params['action'] === 'login') {
                        $this->loginUser();
                    } else {
                        $this->sendError("Invalid action", 400);
                    }
                } else {
                    $this->sendError("Action not specified", 400);
                }
                break;
            default:
                $this->sendError("Method not allowed", 405);
                break;
        }
    }
    
    private function registerUser() {
        if (!$this->validateRequiredParams(['name', 'email', 'password'])) {
            return;
        }
        
        $name = $this->params['name'];
        $email = $this->params['email'];
        $password = password_hash($this->params['password'], PASSWORD_DEFAULT);
        
        // Check if email already exists
        $stmt = $this->conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $this->sendError("Email already in use", 409);
            return;
        }
        
        // Insert new user
        $stmt = $this->conn->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $name, $email, $password);
        
        if ($stmt->execute()) {
            $userId = $this->conn->insert_id;
            $this->sendResponse([
                'id' => $userId,
                'name' => $name,
                'email' => $email,
                'token' => $this->generateToken($userId) // In a real app, use JWT
            ]);
        } else {
            $this->sendError("Database error: " . $this->conn->error, 500);
        }
    }
    
    private function loginUser() {
        if (!$this->validateRequiredParams(['email', 'password'])) {
            return;
        }
        
        $email = $this->params['email'];
        $password = $this->params['password'];
        
        $stmt = $this->conn->prepare("SELECT id, name, password FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $this->sendError("Invalid email or password", 401);
            return;
        }
        
        $user = $result->fetch_assoc();
        
        if (password_verify($password, $user['password'])) {
            $this->sendResponse([
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $email,
                'token' => $this->generateToken($user['id']) // In a real app, use JWT
            ]);
        } else {
            $this->sendError("Invalid email or password", 401);
        }
    }
    
    private function generateToken($userId) {
        // Simple token generation using JWT_SECRET from environment
        // In production, consider using a proper JWT library
        $payload = [
            'user_id' => $userId,
            'issued_at' => time(),
            'expires_at' => time() + (defined('SESSION_TIMEOUT') ? SESSION_TIMEOUT : 3600)
        ];

        $secret = defined('JWT_SECRET') ? JWT_SECRET : 'default_secret_change_this';
        return base64_encode(json_encode($payload) . '.' . hash_hmac('sha256', json_encode($payload), $secret));
    }
}
?>