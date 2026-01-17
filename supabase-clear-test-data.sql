-- ============================================
-- CLEAR TEST DATA SCRIPT
-- Run this to remove all test data from Supabase
-- ============================================

-- Delete in reverse order of dependencies
DELETE FROM expense_payers WHERE expense_id IN (SELECT expense_id FROM expenses);
DELETE FROM expense_participants WHERE expense_id IN (SELECT expense_id FROM expenses);
DELETE FROM expense_scopes WHERE expense_id IN (SELECT expense_id FROM expenses);
DELETE FROM expenses;
DELETE FROM activities;
DELETE FROM group_members;
DELETE FROM groups;
DELETE FROM users;

-- Or if you want to keep some data and only remove test users/groups:
-- DELETE FROM group_members WHERE group_id LIKE '10000000-%';
-- DELETE FROM groups WHERE group_id LIKE '10000000-%';
-- DELETE FROM users WHERE user_id LIKE '00000000-%';
