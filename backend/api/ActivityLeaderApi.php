<?php
require_once 'BaseApi.php';

class ActivityLeaderApi extends BaseApi {
    public function processRequest() {
        if (!$this->isAuthorized()) {
            $this->sendError("Unauthorized", 401);
            return;
        }

        switch ($this->requestMethod) {
            case 'GET':
                if (isset($this->params['activity_id'])) {
                    $this->getActivityLeaders($this->params['activity_id']);
                } else {
                    $this->sendError("Activity ID is required", 400);
                }
                break;
            case 'POST':
                $this->assignActivityLeader();
                break;
            case 'DELETE':
                if (isset($this->params['id'])) {
                    $this->removeActivityLeader($this->params['id']);
                } else {
                    $this->sendError("Leader assignment ID is required", 400);
                }
                break;
            default:
                $this->sendError("Method not allowed", 405);
                break;
        }
    }

    private function getActivityLeaders($activityId) {
        // First check if user has permission to view leaders
        if (!$this->canManageActivity($activityId)) {
            $this->sendError("Unauthorized to view activity leaders", 403);
            return;
        }

        $sql = "SELECT al.*, u.name, u.email 
                FROM activity_leaders al
                JOIN users u ON al.user_id = u.id
                WHERE al.activity_id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $activityId);
        
        if ($stmt->execute()) {
            $result = $stmt->get_result();
            $leaders = [];
            while ($row = $result->fetch_assoc()) {
                $leaders[] = [
                    'id' => $row['id'],
                    'user_id' => $row['user_id'],
                    'name' => $row['name'],
                    'email' => $row['email'],
                    'assigned_at' => $row['assigned_at']
                ];
            }
            $this->sendResponse($leaders);
        } else {
            $this->sendError("Failed to get activity leaders", 500);
        }
    }

    private function assignActivityLeader() {
        if (!$this->validateRequiredParams(['activity_id', 'user_id'])) {
            return;
        }

        $activityId = $this->params['activity_id'];
        $userId = $this->params['user_id'];

        // Check if user has permission to assign leaders
        if (!$this->canManageActivity($activityId)) {
            $this->sendError("Unauthorized to assign activity leaders", 403);
            return;
        }

        // Check if the assignment already exists
        $stmt = $this->conn->prepare("SELECT id FROM activity_leaders WHERE activity_id = ? AND user_id = ?");
        $stmt->bind_param("ii", $activityId, $userId);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            $this->sendError("User is already assigned as a leader for this activity", 409);
            return;
        }

        // Create the assignment
        $stmt = $this->conn->prepare("INSERT INTO activity_leaders (activity_id, user_id, assigned_by) VALUES (?, ?, ?)");
        $currentUserId = $this->getCurrentUserId();
        $stmt->bind_param("iii", $activityId, $userId, $currentUserId);

        if ($stmt->execute()) {
            $this->sendResponse([
                'id' => $stmt->insert_id,
                'message' => 'Activity leader assigned successfully'
            ]);
        } else {
            $this->sendError("Failed to assign activity leader", 500);
        }
    }

    private function removeActivityLeader($id) {
        // Get activity_id first to check permissions
        $stmt = $this->conn->prepare("SELECT activity_id FROM activity_leaders WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $this->sendError("Activity leader assignment not found", 404);
            return;
        }

        $activityId = $result->fetch_assoc()['activity_id'];

        // Check if user has permission to remove leaders
        if (!$this->canManageActivity($activityId)) {
            $this->sendError("Unauthorized to remove activity leaders", 403);
            return;
        }

        // Remove the assignment
        $stmt = $this->conn->prepare("DELETE FROM activity_leaders WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            $this->sendResponse(['message' => 'Activity leader removed successfully']);
        } else {
            $this->sendError("Failed to remove activity leader", 500);
        }
    }

    private function canManageActivity($activityId) {
        // Get the event creator ID for this activity
        $sql = "SELECT e.creator_id 
                FROM activities a 
                JOIN events e ON a.event_id = e.id 
                WHERE a.id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $activityId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            return false;
        }

        $creatorId = $result->fetch_assoc()['creator_id'];
        return $this->getCurrentUserId() === $creatorId;
    }
}
?>
