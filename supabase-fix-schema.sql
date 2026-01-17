-- ============================================
-- FIX DATABASE SCHEMA
-- This script fixes the schema to use user_id and group_id as primary keys
-- Run this in your Supabase SQL Editor
-- ============================================

-- First, let's check what we need to fix
-- If you have tables with 'id' as primary key, we need to drop and recreate them

-- ============================================
-- STEP 1: Drop existing tables (if they exist with wrong schema)
-- ============================================
-- WARNING: This will delete all data! Only run if you haven't added important data yet.

-- Drop in reverse order of dependencies
DROP TABLE IF EXISTS expense_payers CASCADE;
DROP TABLE IF EXISTS expense_participants CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- STEP 2: Recreate tables with correct schema
-- ============================================

-- USERS TABLE - user_id is the PRIMARY KEY
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  profile_image_url TEXT,
  member_since TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GROUPS TABLE - group_id is the PRIMARY KEY
CREATE TABLE groups (
  group_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_name TEXT NOT NULL,
  group_icon TEXT,
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GROUP MEMBERS TABLE - Composite primary key (group_id, user_id)
-- No separate 'id' column, just the relationship
CREATE TABLE group_members (
  group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)  -- Composite primary key
);

-- EXPENSES TABLE - expense_id is the PRIMARY KEY
-- scopes is stored as JSONB column (array of {type: 'user'|'group', id: UUID})
CREATE TABLE expenses (
  expense_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_by UUID NOT NULL REFERENCES users(user_id),
  split_type TEXT NOT NULL CHECK (split_type IN ('equal', 'percentage', 'share')),
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of {type: 'user'|'group', id: UUID}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXPENSE PARTICIPANTS TABLE
CREATE TABLE expense_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- This one can have id since it's a junction table
  expense_id UUID NOT NULL REFERENCES expenses(expense_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount_owed DECIMAL(10, 2),
  percentage DECIMAL(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expense_id, user_id)
);

-- EXPENSE PAYERS TABLE
CREATE TABLE expense_payers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- This one can have id since it's a junction table
  expense_id UUID NOT NULL REFERENCES expenses(expense_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount_paid DECIMAL(10, 2) NOT NULL CHECK (amount_paid > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expense_id, user_id)
);

-- ACTIVITIES TABLE
CREATE TABLE activities (
  activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('EXPENSE', 'SETTLEMENT')),
  expense_id UUID REFERENCES expenses(expense_id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(group_id) ON DELETE SET NULL,
  from_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  amount DECIMAL(10, 2),
  status TEXT CHECK (status IN ('SUCCESS', 'FAILED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create indexes
-- ============================================
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
-- Index on expenses.scopes for querying by scope type/id
CREATE INDEX idx_expenses_scopes ON expenses USING GIN (scopes);
CREATE INDEX idx_expense_participants_expense_id ON expense_participants(expense_id);
CREATE INDEX idx_expense_participants_user_id ON expense_participants(user_id);
CREATE INDEX idx_expense_payers_expense_id ON expense_payers(expense_id);
CREATE INDEX idx_expense_payers_user_id ON expense_payers(user_id);
CREATE INDEX idx_activities_group_id ON activities(group_id);
CREATE INDEX idx_activities_from_user_id ON activities(from_user_id);
CREATE INDEX idx_activities_to_user_id ON activities(to_user_id);

-- ============================================
-- STEP 4: Create triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 5: Enable RLS (Row Level Security)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: Create RLS Policies (Permissive for development)
-- ============================================

-- USERS POLICIES
CREATE POLICY "Allow all reads on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow all updates on users" ON users FOR UPDATE USING (true);
CREATE POLICY "Allow all inserts on users" ON users FOR INSERT WITH CHECK (true);

-- GROUPS POLICIES
CREATE POLICY "Allow all reads on groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on groups" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates on groups" ON groups FOR UPDATE USING (true);

-- GROUP MEMBERS POLICIES
CREATE POLICY "Allow all reads on group_members" ON group_members FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on group_members" ON group_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all deletes on group_members" ON group_members FOR DELETE USING (true);

-- EXPENSES POLICIES
CREATE POLICY "Allow all reads on expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on expenses" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates on expenses" ON expenses FOR UPDATE USING (true);

-- EXPENSE PARTICIPANTS POLICIES
CREATE POLICY "Allow all reads on expense_participants" ON expense_participants FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on expense_participants" ON expense_participants FOR INSERT WITH CHECK (true);

-- EXPENSE PAYERS POLICIES
CREATE POLICY "Allow all reads on expense_payers" ON expense_payers FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on expense_payers" ON expense_payers FOR INSERT WITH CHECK (true);

-- ACTIVITIES POLICIES
CREATE POLICY "Allow all reads on activities" ON activities FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on activities" ON activities FOR INSERT WITH CHECK (true);

-- ============================================
-- DONE! Now run the seed data script again
-- ============================================
-- After running this, execute supabase-seed-data.sql to populate test data
