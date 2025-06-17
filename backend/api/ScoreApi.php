<?php
require_once 'BaseApi.php';

class ScoreApi extends BaseApi {
    
    // Get teams for an event
    private function getEventTeams() {
        if (!$this->validateRequiredParams(['event_id'])) {
            return;
        }
        
        $eventId = $this->params['event_id'];
        
        // Check if user has access to this event (creator or activity leader)
        if (!$this->hasEventAccess($eventId)) {
            $this->sendError("Not authorized to view teams for this event", 403);
            return;
        }
        
        $stmt = $this->conn->prepare("
            SELECT t.*, u.name as created_by_name
            FROM teams t
            JOIN users u ON t.created_by = u.id
            WHERE t.event_id = ?
            ORDER BY t.name
        ");
        $stmt->bind_param("i", $eventId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $teams = [];
        while ($team = $result->fetch_assoc()) {
            $teams[] = $team;
        }
        
        $this->sendResponse(['teams' => $teams]);
    }
    
    // Add a new team to an event
    private function addTeam() {
        if (!$this->validateRequiredParams(['event_id', 'name'])) {
            return;
        }
        
        $eventId = $this->params['event_id'];
        $teamName = trim($this->params['name']);
        
        // Check if user has access to this event
        if (!$this->hasEventAccess($eventId)) {
            $this->sendError("Not authorized to add teams to this event", 403);
            return;
        }
        
        // Check if team name already exists for this event
        $checkStmt = $this->conn->prepare("SELECT id FROM teams WHERE event_id = ? AND name = ?");
        $checkStmt->bind_param("is", $eventId, $teamName);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            $this->sendError("Team name already exists for this event", 400);
            return;
        }
        
        $currentUserId = $this->getCurrentUserId();
        
        $stmt = $this->conn->prepare("
            INSERT INTO teams (event_id, name, created_by) 
            VALUES (?, ?, ?)
        ");
        $stmt->bind_param("isi", $eventId, $teamName, $currentUserId);
        
        if ($stmt->execute()) {
            $teamId = $this->conn->insert_id;
            $this->sendResponse([
                'id' => $teamId,
                'event_id' => $eventId,
                'name' => $teamName,
                'created_by' => $currentUserId
            ], 201);
        } else {
            $this->sendError("Database error: " . $this->conn->error, 500);
        }
    }
    
    // Get activity details with teams and score categories for scoring
    private function getActivityForScoring() {
        if (!$this->validateRequiredParams(['activity_id'])) {
            return;
        }
        
        $activityId = $this->params['activity_id'];
        
        // Check if user has access to score this activity
        if (!$this->hasActivityScoringAccess($activityId)) {
            $this->sendError("Not authorized to score this activity", 403);
            return;
        }
        
        // Get activity details
        $stmt = $this->conn->prepare("
            SELECT a.*, e.name as event_name, e.id as event_id
            FROM activities a
            JOIN events e ON a.event_id = e.id
            WHERE a.id = ?
        ");
        $stmt->bind_param("i", $activityId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $this->sendError("Activity not found", 404);
            return;
        }
        
        $activity = $result->fetch_assoc();
        
        // Get score categories
        $categoriesStmt = $this->conn->prepare("
            SELECT * FROM score_categories 
            WHERE activity_id = ? 
            ORDER BY name
        ");
        $categoriesStmt->bind_param("i", $activityId);
        $categoriesStmt->execute();
        $categoriesResult = $categoriesStmt->get_result();
        
        $categories = [];
        while ($category = $categoriesResult->fetch_assoc()) {
            $categories[] = $category;
        }
        
        // Get teams for this event
        $teamsStmt = $this->conn->prepare("
            SELECT * FROM teams 
            WHERE event_id = ? 
            ORDER BY name
        ");
        $teamsStmt->bind_param("i", $activity['event_id']);
        $teamsStmt->execute();
        $teamsResult = $teamsStmt->get_result();
        
        $teams = [];
        while ($team = $teamsResult->fetch_assoc()) {
            $teams[] = $team;
        }
        
        // Get existing scores
        $scoresStmt = $this->conn->prepare("
            SELECT s.*, t.name as team_name, sc.name as category_name, u.name as scored_by_name
            FROM scores s
            JOIN teams t ON s.team_id = t.id
            JOIN score_categories sc ON s.category_id = sc.id
            JOIN users u ON s.scored_by = u.id
            WHERE s.activity_id = ?
            ORDER BY t.name, sc.name
        ");
        $scoresStmt->bind_param("i", $activityId);
        $scoresStmt->execute();
        $scoresResult = $scoresStmt->get_result();
        
        $scores = [];
        while ($score = $scoresResult->fetch_assoc()) {
            $scores[] = $score;
        }
        
        $activity['score_categories'] = $categories;
        $activity['teams'] = $teams;
        $activity['scores'] = $scores;
        
        $this->sendResponse($activity);
    }
    
    // Submit scores for a team
    private function submitScore() {
        if (!$this->validateRequiredParams(['activity_id', 'team_id', 'category_id', 'score_value'])) {
            return;
        }
        
        $activityId = $this->params['activity_id'];
        $teamId = $this->params['team_id'];
        $categoryId = $this->params['category_id'];
        $scoreValue = floatval($this->params['score_value']);
        $notes = $this->params['notes'] ?? '';
        
        // Check if user has access to score this activity
        if (!$this->hasActivityScoringAccess($activityId)) {
            $this->sendError("Not authorized to score this activity", 403);
            return;
        }
        
        // Validate score value against category max_score
        $categoryStmt = $this->conn->prepare("SELECT max_score FROM score_categories WHERE id = ? AND activity_id = ?");
        $categoryStmt->bind_param("ii", $categoryId, $activityId);
        $categoryStmt->execute();
        $categoryResult = $categoryStmt->get_result();
        
        if ($categoryResult->num_rows === 0) {
            $this->sendError("Invalid score category for this activity", 400);
            return;
        }
        
        $category = $categoryResult->fetch_assoc();
        if ($scoreValue > $category['max_score'] || $scoreValue < 0) {
            $this->sendError("Score value must be between 0 and " . $category['max_score'], 400);
            return;
        }
        
        $currentUserId = $this->getCurrentUserId();
        
        // Insert or update score (using ON DUPLICATE KEY UPDATE)
        $stmt = $this->conn->prepare("
            INSERT INTO scores (activity_id, team_id, category_id, score_value, scored_by, notes) 
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                score_value = VALUES(score_value),
                scored_by = VALUES(scored_by),
                notes = VALUES(notes),
                scored_at = CURRENT_TIMESTAMP
        ");
        $stmt->bind_param("iiidis", $activityId, $teamId, $categoryId, $scoreValue, $currentUserId, $notes);
        
        if ($stmt->execute()) {
            $this->sendResponse([
                'activity_id' => $activityId,
                'team_id' => $teamId,
                'category_id' => $categoryId,
                'score_value' => $scoreValue,
                'notes' => $notes,
                'scored_by' => $currentUserId
            ]);
        } else {
            $this->sendError("Database error: " . $this->conn->error, 500);
        }
    }
    
    // Check if user has access to an event (creator or activity leader)
    private function hasEventAccess($eventId) {
        $currentUserId = $this->getCurrentUserId();
        
        // Check if user is event creator
        $stmt = $this->conn->prepare("SELECT id FROM events WHERE id = ? AND creator_id = ?");
        $stmt->bind_param("ii", $eventId, $currentUserId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            return true;
        }
        
        // Check if user is activity leader for any activity in this event
        $stmt = $this->conn->prepare("
            SELECT al.id 
            FROM activity_leaders al
            JOIN activities a ON al.activity_id = a.id
            WHERE a.event_id = ? AND al.user_id = ?
        ");
        $stmt->bind_param("ii", $eventId, $currentUserId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->num_rows > 0;
    }
    
    // Check if user has access to score a specific activity
    private function hasActivityScoringAccess($activityId) {
        $currentUserId = $this->getCurrentUserId();
        
        // Check if user is event creator
        $stmt = $this->conn->prepare("
            SELECT e.creator_id 
            FROM events e
            JOIN activities a ON e.id = a.event_id
            WHERE a.id = ?
        ");
        $stmt->bind_param("i", $activityId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $event = $result->fetch_assoc();
            if ($event['creator_id'] == $currentUserId) {
                return true;
            }
        }
        
        // Check if user is activity leader for this specific activity
        $stmt = $this->conn->prepare("
            SELECT id FROM activity_leaders 
            WHERE activity_id = ? AND user_id = ?
        ");
        $stmt->bind_param("ii", $activityId, $currentUserId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->num_rows > 0;
    }
    
    public function processRequest() {
        $action = $this->params['action'] ?? '';
        
        switch ($action) {
            case 'get_event_teams':
                $this->getEventTeams();
                break;
            case 'add_team':
                $this->addTeam();
                break;
            case 'get_activity_for_scoring':
                $this->getActivityForScoring();
                break;
            case 'submit_score':
                $this->submitScore();
                break;
            default:
                $this->sendError("Invalid action", 400);
        }
    }
}
?>
