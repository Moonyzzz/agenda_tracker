ALTER TABLE planner_members
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE planner_invites
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'revoked'));

ALTER TABLE planner_invites
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

ALTER TABLE polls
  ADD COLUMN IF NOT EXISTS approved_event_id uuid REFERENCES events(id) ON DELETE SET NULL;

UPDATE planner_invites
SET status = CASE
  WHEN accepted_at IS NOT NULL THEN 'accepted'
  WHEN expires_at < now() THEN 'revoked'
  ELSE 'pending'
END
WHERE status IS DISTINCT FROM CASE
  WHEN accepted_at IS NOT NULL THEN 'accepted'
  WHEN expires_at < now() THEN 'revoked'
  ELSE 'pending'
END;

CREATE INDEX IF NOT EXISTS planner_invites_status_idx ON planner_invites (status);

CREATE POLICY "planner_members_update" ON planner_members
  FOR UPDATE
  USING (is_planner_owner(planner_id))
  WITH CHECK (is_planner_owner(planner_id));

CREATE POLICY "poll_suggestions_update" ON poll_suggestions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM polls p
      WHERE p.id = poll_suggestions.poll_id
        AND is_planner_editor_or_owner(p.planner_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls p
      WHERE p.id = poll_suggestions.poll_id
        AND is_planner_editor_or_owner(p.planner_id)
    )
  );

DROP POLICY planner_invites_select ON planner_invites;
DROP POLICY planner_invites_delete ON planner_invites;

CREATE POLICY planner_invites_select ON planner_invites
  FOR SELECT USING (
    is_planner_owner(planner_id)
    OR (
      status = 'pending'
      AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

CREATE POLICY planner_invites_update ON planner_invites
  FOR UPDATE USING (
    is_planner_owner(planner_id)
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (
    is_planner_owner(planner_id)
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

CREATE POLICY planner_invites_delete ON planner_invites
  FOR DELETE USING (is_planner_owner(planner_id));
