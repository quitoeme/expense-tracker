-- ============================================================
-- FIX: group_members RLS policy - circular deadlock on INSERT
-- ============================================================
-- Problem: When a user creates a group and tries to add themselves
-- as the first admin member, the INSERT policy on group_members
-- checked groups.created_by via a subquery. However, the groups
-- SELECT policy requires the user to already be a member of that
-- group, creating a circular deadlock.
--
-- Fix: Add a SECURITY DEFINER helper function that bypasses RLS
-- to check if the current user is the group creator.
-- ============================================================

-- Step 1: Create SECURITY DEFINER helper function
CREATE OR REPLACE FUNCTION is_group_creator(p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND created_by = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Drop the old broken policy
DROP POLICY IF EXISTS "Group admins can add members" ON group_members;

-- Step 3: Create the fixed policy
CREATE POLICY "Authenticated users can insert group members"
ON group_members FOR INSERT TO authenticated
WITH CHECK (
  -- User is an existing admin of the group
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
  OR
  -- User is adding themselves as the group creator (uses SECURITY DEFINER to bypass RLS)
  (
    group_members.user_id = auth.uid()
    AND is_group_creator(group_members.group_id)
  )
);
