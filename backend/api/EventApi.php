<?php
require_once 'BaseApi.php';

class EventApi extends BaseApi {
    public function processRequest() {
        if (!$this->isAuthorized() && $this->requestMethod !== 'GET') {
            $this->sendError("Unauthorized", 401);
            return;
        }
        
        switch ($this->requestMethod) {
            case 'GET':
                if (isset($this->params['id'])) {
                    $this->getEvent($this->params['id']);
                } elseif (isset($this->params['user_events'])) {
                    $this->getUserEvents();
                } else {
                    $this->getAllEvents();
                }
                break;
            case 'POST':
                $this->createEvent();
                break;
            case 'PUT':
                if (isset($this->params['id'])) {
                    $this->updateEvent($this->params['id']);
                } else {
                    $this->sendError("Event ID is required", 400);
                }
                break;
            case 'DELETE':
                if (isset($this->params['id'])) {
                    $this->deleteEvent($this->params['id']);
                } else {
                    $this->sendError("Event ID is required", 400);
                }
                break;
            default:
                $this->sendError("Method not allowed", 405);
                break;
        }
    }
    
    private function getAllEvents() {
        $sql = "SELECT e.*, u.name as creator_name 
                FROM events e 
                JOIN users u ON e.creator_id = u.id 
                ORDER BY e.start_date";
        
        $result = $this->conn->query($sql);
        $events = [];
        
        while ($row = $result->fetch_assoc()) {
            $events[] = $row;
        }
        
        $this->sendResponse(['events' => $events]);
    }
    
    private function getEvent($id) {
        // Get event details
        $stmt = $this->conn->prepare("
            SELECT e.*, u.name as creator_name 
            FROM events e 
            JOIN users u ON e.creator_id = u.id 
            WHERE e.id = ?
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $this->sendError("Event not found", 404);
            return;
        }
        
        $event = $result->fetch_assoc();
        
        // Get activities with their leaders
        $stmt = $this->conn->prepare("
            SELECT a.*, 
                   GROUP_CONCAT(DISTINCT CONCAT(u.name) SEPARATOR ', ') as leader_names,
                   COUNT(DISTINCT al.id) as leader_count
            FROM activities a 
            LEFT JOIN activity_leaders al ON a.id = al.activity_id
            LEFT JOIN users u ON al.user_id = u.id
            WHERE a.event_id = ?
            GROUP BY a.id
            ORDER BY a.activity_date
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $activitiesResult = $stmt->get_result();
        
        $activities = [];
        while ($activity = $activitiesResult->fetch_assoc()) {
            // Get score categories for this activity
            $categoryStmt = $this->conn->prepare("
                SELECT *
                FROM score_categories
                WHERE activity_id = ?
                ORDER BY name
            ");
            $categoryStmt->bind_param("i", $activity['id']);
            $categoryStmt->execute();
            $categoriesResult = $categoryStmt->get_result();

            $categories = [];            while ($category = $categoriesResult->fetch_assoc()) {
                $categories[] = $category;
            }
            
            // Parse leader names into an array if they exist
            if (!empty($activity['leader_names'])) {
                $activity['leaders'] = array_map(function($name) {
                    return ['name' => trim($name)];
                }, explode(',', $activity['leader_names']));
            } else {
                $activity['leaders'] = [];
            }
            unset($activity['leader_names']); // Remove the concatenated string
            
            $activity['score_categories'] = $categories;
            $activities[] = $activity;
        }

        $event['activities'] = $activities;
        
        $this->sendResponse($event);
    }
    
    private function createEvent() {
        if (!$this->validateRequiredParams(['name', 'start_date', 'end_date'])) {
            return;
        }
        
        $creatorId = $this->getCurrentUserId();
        $name = $this->params['name'];
        $description = $this->params['description'] ?? '';
        $startDate = $this->params['start_date'];
        $endDate = $this->params['end_date'];
        
        $stmt = $this->conn->prepare("
            INSERT INTO events (creator_id, name, description, start_date, end_date) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("issss", $creatorId, $name, $description, $startDate, $endDate);
        
        if ($stmt->execute()) {
            $eventId = $this->conn->insert_id;
            $this->sendResponse([
                'id' => $eventId,
                'name' => $name,
                'description' => $description,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'creator_id' => $creatorId
            ], 201);
        } else {
            $this->sendError("Database error: " . $this->conn->error, 500);
        }
    }
    
    private function updateEvent($id) {
        // Check if event exists and user is the creator
        $stmt = $this->conn->prepare("SELECT creator_id FROM events WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $this->sendError("Event not found", 404);
            return;
        }
        
        $event = $result->fetch_assoc();
        $currentUserId = $this->getCurrentUserId();
        
        if ($event['creator_id'] != $currentUserId) {
            $this->sendError("Not authorized to update this event", 403);
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
        
        if (isset($this->params['start_date'])) {
            $updateFields[] = "start_date = ?";
            $types .= "s";
            $values[] = $this->params['start_date'];
        }
        
        if (isset($this->params['end_date'])) {
            $updateFields[] = "end_date = ?";
            $types .= "s";
            $values[] = $this->params['end_date'];
        }
        
        if (empty($updateFields)) {
            $this->sendError("No fields to update", 400);
            return;
        }
        
        $sql = "UPDATE events SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $types .= "i";
        $values[] = $id;
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$values);
        
        if ($stmt->execute()) {
            $this->sendResponse(['message' => 'Event updated successfully']);
        } else {
            $this->sendError("Database error: " . $this->conn->error, 500);
        }
    }
    
    private function deleteEvent($id) {
        // Check if event exists and user is the creator
        $stmt = $this->conn->prepare("SELECT creator_id FROM events WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $this->sendError("Event not found", 404);
            return;
        }
        
        $event = $result->fetch_assoc();
        $currentUserId = $this->getCurrentUserId();
        
        if ($event['creator_id'] != $currentUserId) {
            $this->sendError("Not authorized to delete this event", 403);
            return;
        }
        
        $stmt = $this->conn->prepare("DELETE FROM events WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            $this->sendResponse(['message' => 'Event deleted successfully']);
        } else {
            $this->sendError("Database error: " . $this->conn->error, 500);
        }
    }
    
    private function getUserEvents() {
        $userId = $this->getCurrentUserId();
        if (!$userId) {
            $this->sendError("Unauthorized", 401);
            return;
        }

        // Get events where user is either creator or activity leader
        $sql = "SELECT DISTINCT e.*, u.name as creator_name,
                (e.creator_id = ?) as is_creator,
                EXISTS(
                    SELECT 1 FROM activities a 
                    JOIN activity_leaders al ON a.id = al.activity_id 
                    WHERE a.event_id = e.id AND al.user_id = ?
                ) as is_leader
                FROM events e
                JOIN users u ON e.creator_id = u.id
                LEFT JOIN activities a ON e.id = a.event_id
                LEFT JOIN activity_leaders al ON a.id = al.activity_id
                WHERE e.creator_id = ? OR al.user_id = ?
                ORDER BY e.start_date";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("iiii", $userId, $userId, $userId, $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $events = [];
        while ($row = $result->fetch_assoc()) {
            // Get activities for this event
            $eventId = $row['id'];
            $activitiesStmt = $this->conn->prepare("
                SELECT a.*, 
                    GROUP_CONCAT(
                        DISTINCT JSON_OBJECT(
                            'id', u.id,
                            'name', u.name
                        )
                    ) as leaders
                FROM activities a
                LEFT JOIN activity_leaders al ON a.id = al.activity_id
                LEFT JOIN users u ON al.user_id = u.id
                WHERE a.event_id = ?
                GROUP BY a.id
            ");
            $activitiesStmt->bind_param("i", $eventId);
            $activitiesStmt->execute();
            $activitiesResult = $activitiesStmt->get_result();
            
            $activities = [];
            while ($activity = $activitiesResult->fetch_assoc()) {
                if ($activity['leaders']) {
                    // Parse the JSON string of leaders into an array
                    $leadersJson = '[' . str_replace('}{', '},{', $activity['leaders']) . ']';
                    $activity['leaders'] = json_decode($leadersJson);
                } else {
                    $activity['leaders'] = [];
                }
                $activities[] = $activity;
            }
            
            $row['activities'] = $activities;
            $events[] = $row;
        }
        
        $this->sendResponse(['events' => $events]);
    }
}
?>