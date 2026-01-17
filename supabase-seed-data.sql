-- ============================================
-- SUPABASE SEED DATA SCRIPT
-- Run this in your Supabase SQL Editor
-- ============================================

-- First, let's create some test users
-- Note: These UUIDs are fixed so you can reference them consistently

INSERT INTO users (user_id, user_name, email, phone, profile_image_url, member_since)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test User', 'test@example.com', '9999999999', 'https://i.pravatar.cc/150?img=1', NOW()),
  ('00000000-0000-0000-0000-000000000002', 'Alice Johnson', 'alice@example.com', '+1234567890', 'https://i.pravatar.cc/150?img=2', NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Bob Smith', 'bob@example.com', '+1234567891', 'https://i.pravatar.cc/150?img=3', NOW()),
  ('00000000-0000-0000-0000-000000000004', 'Charlie Brown', 'charlie@example.com', '+1234567892', 'https://i.pravatar.cc/150?img=4', NOW()),
  ('00000000-0000-0000-0000-000000000005', 'Diana Prince', 'diana@example.com', '+1234567893', 'https://i.pravatar.cc/150?img=5', NOW()),
  ('00000000-0000-0000-0000-000000000006', 'Eve Wilson', 'eve@example.com', '+1234567894', 'https://i.pravatar.cc/150?img=6', NOW()),
  ('00000000-0000-0000-0000-000000000007', 'Frank Miller', 'frank@example.com', '+1234567895', 'https://i.pravatar.cc/150?img=7', NOW())
ON CONFLICT (user_id) DO UPDATE SET
  user_name = EXCLUDED.user_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  profile_image_url = EXCLUDED.profile_image_url;

-- Create some test groups
INSERT INTO groups (group_id, group_name, group_icon, created_by, created_date)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Weekend Lunch', 'https://i.pravatar.cc/100?img=10', '00000000-0000-0000-0000-000000000001', NOW()),
  ('10000000-0000-0000-0000-000000000002', 'Office Trip', 'https://i.pravatar.cc/100?img=11', '00000000-0000-0000-0000-000000000002', NOW()),
  ('10000000-0000-0000-0000-000000000003', 'Friends Hangout', 'https://i.pravatar.cc/100?img=12', '00000000-0000-0000-0000-000000000001', NOW()),
  ('10000000-0000-0000-0000-000000000004', 'Roommates', 'https://i.pravatar.cc/100?img=13', '00000000-0000-0000-0000-000000000003', NOW())
ON CONFLICT (group_id) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  group_icon = EXCLUDED.group_icon,
  created_by = EXCLUDED.created_by;

-- Add members to groups
-- Group 1: Weekend Lunch (Test User, Alice, Bob)
INSERT INTO group_members (group_id, user_id)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Group 2: Office Trip (Alice, Charlie, Diana, Eve)
INSERT INTO group_members (group_id, user_id)
VALUES
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Group 3: Friends Hangout (Test User, Bob)
INSERT INTO group_members (group_id, user_id)
VALUES
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Group 4: Roommates (Bob, Charlie, Diana, Frank)
INSERT INTO group_members (group_id, user_id)
VALUES
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000007')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- ============================================
-- Create sample expenses (optional - for testing)
-- ============================================

-- Expense 1: Weekend Lunch expense (group scope)
INSERT INTO expenses (expense_id, amount, description, currency, created_by, split_type, scopes)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    45.50,
    'Lunch at Italian Restaurant',
    'USD',
    '00000000-0000-0000-0000-000000000001',
    'equal',
    '[{"type": "group", "id": "10000000-0000-0000-0000-000000000001"}]'::jsonb
  )
ON CONFLICT (expense_id) DO UPDATE SET
  amount = EXCLUDED.amount,
  description = EXCLUDED.description,
  currency = EXCLUDED.currency,
  split_type = EXCLUDED.split_type,
  scopes = EXCLUDED.scopes;

-- Add participants for expense 1 (Test User, Alice, Bob - equal split)
INSERT INTO expense_participants (expense_id, user_id, amount_owed)
VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 15.17),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 15.17),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 15.16)
ON CONFLICT (expense_id, user_id) DO UPDATE SET
  amount_owed = EXCLUDED.amount_owed;

-- Add payer for expense 1 (Test User paid)
INSERT INTO expense_payers (expense_id, user_id, amount_paid)
VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 45.50)
ON CONFLICT (expense_id, user_id) DO UPDATE SET
  amount_paid = EXCLUDED.amount_paid;

-- Expense 2: Individual expense between Test User and Bob (user scopes)
INSERT INTO expenses (expense_id, amount, description, currency, created_by, split_type, scopes)
VALUES
  (
    '20000000-0000-0000-0000-000000000002',
    30.00,
    'Movie tickets',
    'USD',
    '00000000-0000-0000-0000-000000000001',
    'equal',
    '[
      {"type": "user", "id": "00000000-0000-0000-0000-000000000001"},
      {"type": "user", "id": "00000000-0000-0000-0000-000000000003"}
    ]'::jsonb
  )
ON CONFLICT (expense_id) DO UPDATE SET
  amount = EXCLUDED.amount,
  description = EXCLUDED.description,
  currency = EXCLUDED.currency,
  split_type = EXCLUDED.split_type,
  scopes = EXCLUDED.scopes;

-- Add participants for expense 2 (Test User, Bob - equal split)
INSERT INTO expense_participants (expense_id, user_id, amount_owed)
VALUES
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 15.00),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 15.00)
ON CONFLICT (expense_id, user_id) DO UPDATE SET
  amount_owed = EXCLUDED.amount_owed;

-- Add payer for expense 2 (Bob paid)
INSERT INTO expense_payers (expense_id, user_id, amount_paid)
VALUES
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 30.00)
ON CONFLICT (expense_id, user_id) DO UPDATE SET
  amount_paid = EXCLUDED.amount_paid;

-- Expense 3: Office Trip expense (group scope with percentage split)
INSERT INTO expenses (expense_id, amount, description, currency, created_by, split_type, scopes)
VALUES
  (
    '20000000-0000-0000-0000-000000000003',
    120.00,
    'Hotel booking',
    'USD',
    '00000000-0000-0000-0000-000000000002',
    'percentage',
    '[{"type": "group", "id": "10000000-0000-0000-0000-000000000002"}]'::jsonb
  )
ON CONFLICT (expense_id) DO UPDATE SET
  amount = EXCLUDED.amount,
  description = EXCLUDED.description,
  currency = EXCLUDED.currency,
  split_type = EXCLUDED.split_type,
  scopes = EXCLUDED.scopes;

-- Add participants for expense 3 (Alice 40%, Charlie 30%, Diana 20%, Eve 10%)
INSERT INTO expense_participants (expense_id, user_id, amount_owed, percentage)
VALUES
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 48.00, 40.00),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 36.00, 30.00),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 24.00, 20.00),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000006', 12.00, 10.00)
ON CONFLICT (expense_id, user_id) DO UPDATE SET
  amount_owed = EXCLUDED.amount_owed,
  percentage = EXCLUDED.percentage;

-- Add payer for expense 3 (Alice paid)
INSERT INTO expense_payers (expense_id, user_id, amount_paid)
VALUES
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 120.00)
ON CONFLICT (expense_id, user_id) DO UPDATE SET
  amount_paid = EXCLUDED.amount_paid;

-- ============================================
-- Verify the data
-- ============================================
SELECT 'Users created:' as info, COUNT(*) as count FROM users;
SELECT 'Groups created:' as info, COUNT(*) as count FROM groups;
SELECT 'Group members added:' as info, COUNT(*) as count FROM group_members;
SELECT 'Expenses created:' as info, COUNT(*) as count FROM expenses;
SELECT 'Expense participants added:' as info, COUNT(*) as count FROM expense_participants;
SELECT 'Expense payers added:' as info, COUNT(*) as count FROM expense_payers;