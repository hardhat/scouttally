-- Create database
CREATE DATABASE IF NOT EXISTS event_scoring;
USE event_scoring;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    creator_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    activity_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Score categories table
CREATE TABLE IF NOT EXISTS score_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    max_score INT NOT NULL DEFAULT 10,
    weight DECIMAL(3,2) DEFAULT 1.00,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- Teams table (event-specific teams)
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE KEY unique_team_per_event (event_id, name)
);

-- Activity leaders table
CREATE TABLE IF NOT EXISTS activity_leaders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    user_id INT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE KEY (activity_id, user_id)
);

-- Scores table
CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    team_id INT NOT NULL,
    category_id INT NOT NULL,
    score_value DECIMAL(5,2) NOT NULL,
    scored_by INT NOT NULL,
    scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES score_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (scored_by) REFERENCES users(id),
    UNIQUE KEY unique_team_category_score (activity_id, team_id, category_id),
    INDEX idx_activity_scores (activity_id),
    INDEX idx_team_scores (team_id),
    INDEX idx_scored_by (scored_by)
);

-- Add useful indexes for better performance
CREATE INDEX idx_events_creator ON events(creator_id);
CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_activities_event ON activities(event_id);
CREATE INDEX idx_activities_date ON activities(activity_date);
CREATE INDEX idx_score_categories_activity ON score_categories(activity_id);
CREATE INDEX idx_activity_leaders_activity ON activity_leaders(activity_id);
CREATE INDEX idx_activity_leaders_user ON activity_leaders(user_id);
CREATE INDEX idx_teams_event ON teams(event_id);