<?php
require_once 'BaseApi.php';

class ActivityApi extends BaseApi {
    public function processRequest() {
        if (!$this->isAuthorized()) {
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
        // Get activity details
        $stmt = $this->conn->prepare("
            SELECT a.*, e.name as event_name 
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
}
?>