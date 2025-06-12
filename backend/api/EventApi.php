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
        
        // Get activities
        $stmt = $this->conn->prepare("
            SELECT a.*, 
                   (SELECT COUNT(*) FROM activity_leaders al WHERE al.activity_id = a.id) as leader_count
            FROM activities a 
            WHERE a.event_id = ?
            ORDER BY a.activity_date
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $activitiesResult = $stmt->get_result();
        
        $activities = [];
        while ($activity = $activitiesResult->fetch_assoc()) {
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
}
?>