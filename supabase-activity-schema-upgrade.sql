-- ============================================
-- ACTIVITY SCHEMA UPGRADE
-- This script improves the activities system for better querying
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Add actor_user_id column to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activities_actor_user_id ON activities(actor_user_id);

-- Step 2: Create activity_targets junction table
CREATE TABLE IF NOT EXISTS activity_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(activity_id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'group')),
  target_id UUID NOT NULL,  -- Can be user_id or group_id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, target_type, target_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_targets_activity_id ON activity_targets(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_targets_target ON activity_targets(target_type, target_id);

-- Step 3: Backfill actor_user_id for existing EXPENSE activities
-- Set actor to the expense creator
UPDATE activities a
SET actor_user_id = e.created_by
FROM expenses e
WHERE a.activity_type = 'EXPENSE' 
  AND a.expense_id = e.expense_id
  AND a.actor_user_id IS NULL;

-- Step 4: Backfill actor_user_id for existing SETTLEMENT activities
-- Set actor to from_user_id
UPDATE activities
SET actor_user_id = from_user_id
WHERE activity_type = 'SETTLEMENT' 
  AND actor_user_id IS NULL
  AND from_user_id IS NOT NULL;

-- Step 5: Backfill activity_targets for existing EXPENSE activities
-- Insert targets for all participants, payers, and groups
INSERT INTO activity_targets (activity_id, target_type, target_id)
SELECT DISTINCT 
  a.activity_id,
  'user' as target_type,
  ep.user_id as target_id
FROM activities a
JOIN expenses e ON a.expense_id = e.expense_id
JOIN expense_participants ep ON e.expense_id = ep.expense_id
WHERE a.activity_type = 'EXPENSE'
  AND NOT EXISTS (
    SELECT 1 FROM activity_targets at 
    WHERE at.activity_id = a.activity_id 
      AND at.target_type = 'user' 
      AND at.target_id = ep.user_id
  );

INSERT INTO activity_targets (activity_id, target_type, target_id)
SELECT DISTINCT 
  a.activity_id,
  'user' as target_type,
  epay.user_id as target_id
FROM activities a
JOIN expenses e ON a.expense_id = e.expense_id
JOIN expense_payers epay ON e.expense_id = epay.expense_id
WHERE a.activity_type = 'EXPENSE'
  AND NOT EXISTS (
    SELECT 1 FROM activity_targets at 
    WHERE at.activity_id = a.activity_id 
      AND at.target_type = 'user' 
      AND at.target_id = epay.user_id
  );

INSERT INTO activity_targets (activity_id, target_type, target_id)
SELECT DISTINCT 
  a.activity_id,
  'group' as target_type,
  a.group_id as target_id
FROM activities a
WHERE a.activity_type = 'EXPENSE'
  AND a.group_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM activity_targets at 
    WHERE at.activity_id = a.activity_id 
      AND at.target_type = 'group' 
      AND at.target_id = a.group_id
  );

-- Step 6: Backfill activity_targets for existing SETTLEMENT activities
INSERT INTO activity_targets (activity_id, target_type, target_id)
SELECT DISTINCT 
  activity_id,
  'user' as target_type,
  from_user_id as target_id
FROM activities
WHERE activity_type = 'SETTLEMENT'
  AND from_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM activity_targets at 
    WHERE at.activity_id = activities.activity_id 
      AND at.target_type = 'user' 
      AND at.target_id = activities.from_user_id
  );

INSERT INTO activity_targets (activity_id, target_type, target_id)
SELECT DISTINCT 
  activity_id,
  'user' as target_type,
  to_user_id as target_id
FROM activities
WHERE activity_type = 'SETTLEMENT'
  AND to_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM activity_targets at 
    WHERE at.activity_id = activities.activity_id 
      AND at.target_type = 'user' 
      AND at.target_id = activities.to_user_id
  );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check how many activities have actor_user_id
-- SELECT COUNT(*) as total, COUNT(actor_user_id) as with_actor FROM activities;

-- Check activity_targets count
-- SELECT target_type, COUNT(*) FROM activity_targets GROUP BY target_type;
