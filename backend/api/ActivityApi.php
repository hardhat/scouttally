<?php
require_once 'BaseApi.php';

class ActivityApi extends BaseApi {
    public function processRequest() {
        $requiresAuth = false;
        
        // Check if this request requires authentication
        if ($this->requestMethod !== 'GET') {
            $requiresAuth = true;
        } elseif (isset($this->params['id'])) {
            // GET requests for specific activities require authorization if they're not public
            $requiresAuth = !$this->canViewActivity($this->params['id']);
        }
        
        if ($requiresAuth && !$this->isAuthorized()) {
            $this->sendError("Unauthorized", 401);
            return;
        }
        
        switch ($this->requestMethod) {
            case 'GET':
                if (isset($this->params['id'])) {
                    $this->getActivity($this->params['id']);
                } else {
                    $this->sendError("Activity ID is required", 400);
                }
                break;
            case 'POST':
                $this->createActivity();
                break;
            case 'PUT':
                if (isset($this->params['id'])) {
                    $this->updateActivity($this->params['id']);
                } else {
                    $this->sendError("Activity ID is required", 400);
                }
                break;
            case 'DELETE':
                if (isset($this->params['id'])) {
                    $this->deleteActivity($this->params['id']);
                } else {
                    $this->sendError("Activity ID is required", 400);
                }
                break;
            default:
                $this->sendError("Method not allowed", 405);
                break;
        }
    }
    
    private function getActivity($id) {
        // Check if the user has permission to view the activity
        if (!$this->canViewActivity($id)) {
            $this->sendError("Unauthorized to view this activity", 403);
            return;
        }

        // Get activity details with event info and leader info
        $stmt = $this->conn->prepare("
            SELECT a.*, 
                   e.name as event_name,
                   e.start_date as event_start_date,
                   e.end_date as event_end_date,
                   GROUP_CONCAT(DISTINCT CONCAT(u.name) SEPARATOR ', ') as leader_names,
                   COUNT(DISTINCT al.id) as leader_count
            FROM activities a 
            JOIN events e ON a.event_id = e.id 
            LEFT JOIN activity_leaders al ON a.id = al.activity_id
            LEFT JOIN users u ON al.user_id = u.id
            WHERE a.id = ?
            GROUP BY a.id
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $this->sendError("Activity not found", 404);
            return;
        }
        
        $activity = $result->fetch_assoc();
        
        // Get score categories
        $stmt = $this->conn->prepare("
            SELECT * 
            FROM score_categories 
            WHERE activity_id = ?
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $categoriesResult = $stmt->get_result();
        
        $categories = [];
        while ($category = $categoriesResult->fetch_assoc()) {
            $categories[] = $category;
        }
        
        $activity['score_categories'] = $categories;

        // Get activity leaders
        $stmt = $this->conn->prepare("
            SELECT al.*, u.name, u.email
            FROM activity_leaders al
            JOIN users u ON al.user_id = u.id
            WHERE al.activity_id = ?
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $leadersResult = $stmt->get_result();
        
        $leaders = [];
        while ($leader = $leadersResult->fetch_assoc()) {
            $leaders[] = [
                'id' => $leader['id'],
                'user_id' => $leader['user_id'],
                'name' => $leader['name'],
                'email' => $leader['email']
            ];
        }
        
        $activity['leaders'] = $leaders;
        
        // Include event information needed for edit form
        $activity['event'] = [
            'id' => $activity['event_id'],
            'name' => $activity['event_name'],
            'start_date' => $activity['event_start_date'],
            'end_date' => $activity['event_end_date']
        ];
        
        // Clean up redundant fields
        unset($activity['event_name']);
        unset($activity['event_start_date']);
        unset($activity['event_end_date']);
        unset($activity['leader_names']);
        unset($activity['leader_count']);
        
        $this->sendResponse($activity);
    }
    
    private function createActivity() {
        if (!$this->validateRequiredParams(['event_id', 'name', 'activity_date'])) {
            return;
        }

        $eventId = $this->params['event_id'];
        $name = $this->params['name'];
        $description = $this->params['description'] ?? '';
        $activityDate = $this->params['activity_date'];

        // Check if user is authorized (creator of the event)
        $stmt = $this->conn->prepare("SELECT creator_id FROM events WHERE id = ?");
        $stmt->bind_param("i", $eventId);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $this->sendError("Event not found", 404);
            return;
        }

        $event = $result->fetch_assoc();
        $currentUserId = $this->getCurrentUserId();

        if ($event['creator_id'] != $currentUserId) {
            $this->sendError("Not authorized to add activities to this event", 403);
            return;
        }
        
        $stmt = $this->conn->prepare("
            INSERT INTO activities (event_id, name, description, activity_date) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->bind_param("isss", $eventId, $name, $description, $activityDate);
        
        if ($stmt->execute()) {
            $activityId = $this->conn->insert_id;

            // Handle score categories if provided
            if (isset($this->params['score_categories']) && is_array($this->params['score_categories'])) {
                foreach ($this->params['score_categories'] as $category) {
                    if (isset($category['name']) && isset($category['max_score'])) {
                        $categoryName = $category['name'];
                        $maxScore = intval($category['max_score']);
                        $weight = isset($category['weight']) ? floatval($category['weight']) : 1.0;

                        $categoryStmt = $this->conn->prepare("
                            INSERT INTO score_categories (activity_id, name, max_score, weight)
                            VALUES (?, ?, ?, ?)
                        ");
                        $categoryStmt->bind_param("isid", $activityId, $categoryName, $maxScore, $weight);
                        $categoryStmt->execute();
                    }
                }
            }

            $this->sendResponse([
                'id' => $activityId,
                'event_id' => $eventId,
                'name' => $name,
                'description' => $description,
                'activity_date' => $activityDate
            ], 201);
        } else {
            $this->sendError("Database error: " . $this->conn->error, 500);
        }
    }
    
    private function updateActivity($id) {
        if (!$this->validateRequiredParams(['name', 'activity_date'])) {
            return;
        }

        // Check if user has permission to update this activity
        $stmt = $this->conn->prepare("
            SELECT e.creator_id 
            FROM activities a 
            JOIN events e ON a.event_id = e.id 
            WHERE a.id = ?
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $this->sendError("Activity not found", 404);
            return;
        }

        $activity = $result->fetch_assoc();
        if ($activity['creator_id'] !== $this->getCurrentUserId()) {
            $this->sendError("Unauthorized to update this activity", 403);
            return;
        }

        // Update activity
        $stmt = $this->conn->prepare("
            UPDATE activities 
            SET name = ?, description = ?, activity_date = ?
            WHERE id = ?
        ");

        $name = $this->params['name'];
        $description = $this->params['description'] ?? '';
        $activityDate = $this->params['activity_date'];

        $stmt->bind_param("sssi", $name, $description, $activityDate, $id);

        if ($stmt->execute()) {
            // Get updated activity details
            $this->getActivity($id);
        } else {
            $this->sendError("Failed to update activity: " . $this->conn->error, 500);
        }
    }
    
    private function deleteActivity($id) {
        // Check if activity exists
        $stmt = $this->conn->prepare("SELECT event_id FROM activities WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $this->sendError("Activity not found", 404);
            return;
        }
        
        $activity = $result->fetch_assoc();
        $eventId = $activity['event_id'];
        
        // Check if user is authorized (creator of the event)
        $stmt = $this->conn->prepare("SELECT creator_id FROM events WHERE id = ?");
        $stmt->bind_param("i", $eventId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $this->sendError("Event not found", 404);
            return;
        }
        
        $event = $result->fetch_assoc();
        $currentUserId = $this->getCurrentUserId();
        
        if ($event['creator_id'] != $currentUserId) {
            $this->sendError("Not authorized to delete this activity", 403);
            return;
        }
        
        $stmt = $this->conn->prepare("DELETE FROM activities WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            $this->sendResponse(['message' => 'Activity deleted successfully']);
        } else {
            $this->sendError("Database error: " . $this->conn->error, 500);
        }
    }
    
    private function canViewActivity($id) {
        // For now, all activities are public
        // In the future, you might want to check if:
        // 1. The user is the event creator
        // 2. The user is an activity leader
        // 3. The event is public/private
        return true;
    }

    private function canManageActivity($id) {
        // Check if user is the event creator
        $stmt = $this->conn->prepare("
            SELECT e.creator_id 
            FROM activities a 
            JOIN events e ON a.event_id = e.id 
            WHERE a.id = ?
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            return false;
        }

        $row = $result->fetch_assoc();
        return $this->getCurrentUserId() === $row['creator_id'];
    }
}
?>