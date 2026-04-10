-- Fix 1: planners_select — add safety-net so owners can always see their own
-- planners even before the planner_members bootstrap row is inserted.
-- Without this, an INSERT RETURNING on planners fails because PostgREST
-- re-evaluates the SELECT policy immediately and is_planner_member() returns
-- false (the membership row doesn't exist yet).

DROP POLICY "planners_select" ON planners;

CREATE POLICY "planners_select" ON planners
  FOR SELECT
  USING (is_planner_member(id) OR owner_id = auth.uid());

-- Fix 2: planner_members_insert — allow the initial owner membership row to be
-- created. The previous policy used is_planner_owner() which looks up
-- planner_members, causing a chicken-and-egg failure: you can't insert the
-- first membership because there is no membership yet to prove ownership.
-- The new clause allows the insert when:
--   a) the user is already a recorded owner (is_planner_owner) — covers
--      owners adding other members, OR
--   b) the row being inserted is an 'owner' row for a planner whose
--      owner_id column matches auth.uid() — covers the bootstrap insert.

DROP POLICY "planner_members_insert" ON planner_members;

CREATE POLICY "planner_members_insert" ON planner_members
  FOR INSERT
  WITH CHECK (
    is_planner_owner(planner_id)
    OR (
      role = 'owner'
      AND EXISTS (
        SELECT 1 FROM public.planners p
        WHERE p.id = planner_id
          AND p.owner_id = auth.uid()
      )
    )
  );
