<?php
require_once 'ActivityLeaderApi.php';
require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();
$api = new ActivityLeaderApi($db);
$api->processRequest();
?>
