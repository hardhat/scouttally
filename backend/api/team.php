<?php
require_once '../config/database.php';

// Set CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Simple team API placeholder - returns empty array for now
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode(['teams' => []]);
    } else {
        http_response_code(501);
        echo json_encode(['error' => 'Team API not yet implemented']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
}
?>
