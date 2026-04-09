-- Planner invite tokens
CREATE TABLE planner_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id uuid NOT NULL REFERENCES planners ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL CHECK (role IN ('editor', 'observer')),
  token      uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at timestamptz
);

CREATE INDEX ON planner_invites (token);
CREATE INDEX ON planner_invites (planner_id);
CREATE INDEX ON planner_invites (email);

ALTER TABLE planner_invites ENABLE ROW LEVEL SECURITY;

-- Owners can see invites for their planners
CREATE POLICY planner_invites_select ON planner_invites
  FOR SELECT USING (is_planner_owner(planner_id));

-- Owners can create invites
CREATE POLICY planner_invites_insert ON planner_invites
  FOR INSERT WITH CHECK (is_planner_owner(planner_id) AND invited_by = auth.uid());

-- Owners can delete (revoke) invites
CREATE POLICY planner_invites_delete ON planner_invites
  FOR DELETE USING (is_planner_owner(planner_id));
