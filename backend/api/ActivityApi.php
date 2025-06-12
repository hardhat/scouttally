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
            $this->sendError("Not authorized to update this activity", 403);
            return;
        }
        
        // Build update query based on provided parameters
        $updateFields = [];
        $types = "";
        $values = [];
        
        if (isset($this->params['name'])) {
            $updateFields[] = "name = ?";
            $types .= "s";
            $values[] = $this->params['name'];
        }
        
        if (isset($this->params['description'])) {
            $updateFields[] = "description = ?";
            $types .= "s";
            $values[] = $this->params['description'];
        }
        
        if (isset($this->params['activity_date'])) {
            $updateFields[] = "activity_date = ?";
            $types .= "s";
            $values[] = $this->params['activity_date'];
        }
        
        if (empty($updateFields)) {
            $this->sendError("No fields to update", 400);
            return;
        }
        
        $sql = "UPDATE activities SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $types .= "i";
        $values[] = $id;
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$values);
        
        if ($stmt->execute()) {
            $this->sendResponse(['message' => 'Activity updated successfully']);
        } else {
            $this->sendError("Database error: " . $this->conn->error, 500);
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