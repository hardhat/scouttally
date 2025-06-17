-- Migration script to update database schema for event-specific teams
-- Run this if you want to keep existing data

USE event_scoring;

-- Check if migration is needed
SELECT 'Starting migration to event-specific teams...' as status;

-- Step 1: Add event_id column to teams table if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = 'event_scoring' 
                   AND TABLE_NAME = 'teams' 
                   AND COLUMN_NAME = 'event_id');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE teams ADD COLUMN event_id INT NOT NULL DEFAULT 1 AFTER id',
    'SELECT "event_id column already exists" as status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: If you have existing teams, you'll need to assign them to events
-- This is a manual step - update teams to belong to specific events
-- UPDATE teams SET event_id = 1 WHERE id IN (1,2,3); -- Example

-- Step 3: Add foreign key constraint
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                  WHERE TABLE_SCHEMA = 'event_scoring' 
                  AND TABLE_NAME = 'teams' 
                  AND CONSTRAINT_NAME LIKE '%event%');

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE teams ADD FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE',
    'SELECT "Foreign key already exists" as status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Add unique constraint for team names per event
SET @unique_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                      WHERE TABLE_SCHEMA = 'event_scoring' 
                      AND TABLE_NAME = 'teams' 
                      AND INDEX_NAME = 'unique_team_per_event');

SET @sql = IF(@unique_exists = 0,
    'ALTER TABLE teams ADD UNIQUE KEY unique_team_per_event (event_id, name)',
    'SELECT "Unique constraint already exists" as status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Add notes column to scores table
SET @notes_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_SCHEMA = 'event_scoring' 
                     AND TABLE_NAME = 'scores' 
                     AND COLUMN_NAME = 'notes');

SET @sql = IF(@notes_exists = 0,
    'ALTER TABLE scores ADD COLUMN notes TEXT AFTER scored_at',
    'SELECT "Notes column already exists" as status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 6: Add unique constraint for scores
SET @score_unique_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                            WHERE TABLE_SCHEMA = 'event_scoring' 
                            AND TABLE_NAME = 'scores' 
                            AND INDEX_NAME = 'unique_team_category_score');

SET @sql = IF(@score_unique_exists = 0,
    'ALTER TABLE scores ADD UNIQUE KEY unique_team_category_score (activity_id, team_id, category_id)',
    'SELECT "Score unique constraint already exists" as status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 7: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_events_creator ON events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_activities_event ON activities(event_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_score_categories_activity ON score_categories(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_leaders_activity ON activity_leaders(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_leaders_user ON activity_leaders(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_event ON teams(event_id);
CREATE INDEX IF NOT EXISTS idx_activity_scores ON scores(activity_id);
CREATE INDEX IF NOT EXISTS idx_team_scores ON scores(team_id);
CREATE INDEX IF NOT EXISTS idx_scored_by ON scores(scored_by);

SELECT 'Migration completed successfully!' as status;
