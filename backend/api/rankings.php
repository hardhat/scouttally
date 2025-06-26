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
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!isset($_GET['event_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Event ID is required']);
            exit();
        }

        $eventId = $_GET['event_id'];
        
        // Get event details
        $stmt = $db->prepare("
            SELECT e.*, u.name as creator_name 
            FROM events e 
            JOIN users u ON e.creator_id = u.id 
            WHERE e.id = ?
        ");
        $stmt->bind_param("i", $eventId);
        $stmt->execute();
        $eventResult = $stmt->get_result();
        
        if ($eventResult->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Event not found']);
            exit();
        }

        $event = $eventResult->fetch_assoc();

        // Get total activities count
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM activities WHERE event_id = ?");
        $stmt->bind_param("i", $eventId);
        $stmt->execute();
        $activityCount = $stmt->get_result()->fetch_assoc()['total'];

        // Get total teams count
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM teams WHERE event_id = ?");
        $stmt->bind_param("i", $eventId);
        $stmt->execute();
        $teamCount = $stmt->get_result()->fetch_assoc()['total'];

        // Get activities for this event
        $stmt = $db->prepare("
            SELECT 
                a.*,
                CAST(COALESCE(SUM(sc.max_score * sc.weight), 0) AS DECIMAL(10,2)) as max_possible_score,
                COUNT(DISTINCT t.id) as teams_participated,
                GROUP_CONCAT(DISTINCT al.user_id) as leader_ids,
                GROUP_CONCAT(DISTINCT u.name) as leader_names
            FROM activities a
            LEFT JOIN score_categories sc ON a.id = sc.activity_id
            LEFT JOIN scores s ON a.id = s.activity_id
            LEFT JOIN teams t ON s.team_id = t.id
            LEFT JOIN activity_leaders al ON a.id = al.activity_id
            LEFT JOIN users u ON al.user_id = u.id
            WHERE a.event_id = ?
            GROUP BY a.id
            ORDER BY a.activity_date
        ");
        $stmt->bind_param("i", $eventId);
        $stmt->execute();
        $activitiesResult = $stmt->get_result();
        
        $activities = [];
        while ($activity = $activitiesResult->fetch_assoc()) {
            // Format leader information
            if ($activity['leader_ids']) {
                $leaderIds = explode(',', $activity['leader_ids']);
                $leaderNames = explode(',', $activity['leader_names']);
                $activity['leaders'] = array_map(function($id, $name) {
                    return ['id' => $id, 'name' => $name];
                }, $leaderIds, $leaderNames);
            } else {
                $activity['leaders'] = [];
            }
            unset($activity['leader_ids']);
            unset($activity['leader_names']);
            
            $activities[] = $activity;
        }

        // Calculate rankings
        $stmt = $db->prepare("
            SELECT 
                t.id, 
                t.name, 
                t.event_id,
                CAST(COALESCE(SUM(s.score_value * sc.weight), 0) AS DECIMAL(10,2)) as total_score,
                COUNT(DISTINCT a.id) as activities_completed
            FROM teams t
            LEFT JOIN scores s ON t.id = s.team_id
            LEFT JOIN activities a ON s.activity_id = a.id
            LEFT JOIN score_categories sc ON s.category_id = sc.id
            WHERE t.event_id = ?
            GROUP BY t.id
            ORDER BY total_score DESC, activities_completed DESC
        ");
        $stmt->bind_param("i", $eventId);
        $stmt->execute();
        $rankingsResult = $stmt->get_result();

        $rankings = [];
        while ($row = $rankingsResult->fetch_assoc()) {
            $rankings[] = $row;
        }

        // Get maximum possible score for percentage calculations
        $stmt = $db->prepare("
            SELECT CAST(COALESCE(SUM(sc.max_score * sc.weight), 0) AS DECIMAL(10,2)) as max_possible_score
            FROM activities a
            JOIN score_categories sc ON a.id = sc.activity_id
            WHERE a.event_id = ?
        ");
        $stmt->bind_param("i", $eventId);
        $stmt->execute();
        $maxPossibleScore = floatval($stmt->get_result()->fetch_assoc()['max_possible_score']);

        // Add percentage to each ranking
        foreach ($rankings as &$rank) {
            $rank['total_score'] = floatval($rank['total_score']);
            $rank['max_possible_score'] = $maxPossibleScore;
            $rank['score_percentage'] = $maxPossibleScore > 0 
                ? round(($rank['total_score'] / $maxPossibleScore) * 100, 1) 
                : 0;
        }

        echo json_encode([
            'event' => $event,
            'total_activities' => $activityCount,
            'total_teams' => $teamCount,
            'teams' => $rankings,  // Changed from 'rankings' to 'teams'
            'max_possible_score' => $maxPossibleScore,
            'activities' => $activities  // Include the activities data
        ]);
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
}
?>
