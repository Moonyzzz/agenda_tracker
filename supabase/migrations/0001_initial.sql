-- Helper functions

CREATE OR REPLACE FUNCTION is_planner_member(planner_id uuid)
RETURNS bool
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM planner_members
    WHERE planner_members.planner_id = $1
      AND planner_members.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_planner_editor_or_owner(planner_id uuid)
RETURNS bool
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM planner_members
    WHERE planner_members.planner_id = $1
      AND planner_members.user_id = auth.uid()
      AND planner_members.role IN ('editor', 'owner')
  );
$$;

-- Tables

CREATE TABLE planners (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid NOT NULL REFERENCES auth.users,
  name       text NOT NULL,
  bg_color   text NOT NULL DEFAULT '#ffffff',
  day_color  text NOT NULL DEFAULT '#4f46e5',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE planner_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id uuid NOT NULL REFERENCES planners(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users,
  role       text NOT NULL CHECK (role IN ('owner', 'editor', 'observer')),
  invited_by uuid REFERENCES auth.users,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (planner_id, user_id)
);

CREATE TABLE events (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id                 uuid NOT NULL REFERENCES planners(id) ON DELETE CASCADE,
  created_by                 uuid NOT NULL REFERENCES auth.users,
  name                       text NOT NULL,
  description                text,
  image_url                  text,
  start_time                 timestamptz NOT NULL,
  end_time                   timestamptz NOT NULL,
  participants               text[] NOT NULL DEFAULT '{}',
  agenda                     text,
  notes                      text,
  recurrence_type            text NOT NULL DEFAULT 'none' CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly', 'custom')),
  recurrence_interval        int,
  recurrence_end_date        date,
  reminder_enabled           bool NOT NULL DEFAULT false,
  reminder_email             text,
  confirmation_sent          bool NOT NULL DEFAULT false,
  confirmation_acknowledged  bool NOT NULL DEFAULT false,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE polls (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id         uuid NOT NULL REFERENCES planners(id) ON DELETE CASCADE,
  created_by         uuid NOT NULL REFERENCES auth.users,
  event_data         jsonb NOT NULL DEFAULT '{}',
  status             text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'rejected', 'expired')),
  approval_threshold int NOT NULL DEFAULT 2,
  expires_at         timestamptz NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE poll_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users,
  vote       text NOT NULL CHECK (vote IN ('approve', 'reject')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

CREATE TABLE poll_suggestions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id         uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  suggested_by    uuid NOT NULL REFERENCES auth.users,
  field_name      text NOT NULL,
  suggested_value text NOT NULL,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'rejected')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE suggestion_votes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES poll_suggestions(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users,
  vote          text NOT NULL CHECK (vote IN ('approve', 'reject')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (suggestion_id, user_id)
);

-- Trigger: auto-update events.updated_at

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS

ALTER TABLE planners          ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls             ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_suggestions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_votes  ENABLE ROW LEVEL SECURITY;

-- RLS policies: planners

CREATE POLICY "planners_select" ON planners
  FOR SELECT
  USING (is_planner_member(id));

CREATE POLICY "planners_insert" ON planners
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "planners_update" ON planners
  FOR UPDATE
  USING (is_planner_member(id));

CREATE POLICY "planners_delete" ON planners
  FOR DELETE
  USING (is_planner_member(id));

-- RLS policies: planner_members

CREATE POLICY "planner_members_select" ON planner_members
  FOR SELECT
  USING (is_planner_member(planner_id));

CREATE POLICY "planner_members_insert" ON planner_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM planner_members pm
      WHERE pm.planner_id = planner_members.planner_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'owner'
    )
  );

CREATE POLICY "planner_members_delete" ON planner_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM planner_members pm
      WHERE pm.planner_id = planner_members.planner_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'owner'
    )
  );

-- RLS policies: events

CREATE POLICY "events_select" ON events
  FOR SELECT
  USING (is_planner_member(planner_id));

CREATE POLICY "events_insert" ON events
  FOR INSERT
  WITH CHECK (is_planner_editor_or_owner(planner_id));

CREATE POLICY "events_update" ON events
  FOR UPDATE
  USING (is_planner_editor_or_owner(planner_id));

CREATE POLICY "events_delete" ON events
  FOR DELETE
  USING (is_planner_editor_or_owner(planner_id));

-- RLS policies: polls

CREATE POLICY "polls_select" ON polls
  FOR SELECT
  USING (is_planner_member(planner_id));

CREATE POLICY "polls_insert" ON polls
  FOR INSERT
  WITH CHECK (is_planner_editor_or_owner(planner_id));

CREATE POLICY "polls_update" ON polls
  FOR UPDATE
  USING (is_planner_editor_or_owner(planner_id));

CREATE POLICY "polls_delete" ON polls
  FOR DELETE
  USING (is_planner_editor_or_owner(planner_id));

-- RLS policies: poll_votes

CREATE POLICY "poll_votes_select" ON poll_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM polls p
      WHERE p.id = poll_votes.poll_id
        AND is_planner_member(p.planner_id)
    )
  );

CREATE POLICY "poll_votes_insert" ON poll_votes
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM polls p
      WHERE p.id = poll_votes.poll_id
        AND is_planner_editor_or_owner(p.planner_id)
    )
  );

CREATE POLICY "poll_votes_update" ON poll_votes
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM polls p
      WHERE p.id = poll_votes.poll_id
        AND is_planner_editor_or_owner(p.planner_id)
    )
  );

-- RLS policies: poll_suggestions

CREATE POLICY "poll_suggestions_select" ON poll_suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM polls p
      WHERE p.id = poll_suggestions.poll_id
        AND is_planner_member(p.planner_id)
    )
  );

CREATE POLICY "poll_suggestions_insert" ON poll_suggestions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls p
      WHERE p.id = poll_suggestions.poll_id
        AND is_planner_editor_or_owner(p.planner_id)
    )
  );

-- RLS policies: suggestion_votes

CREATE POLICY "suggestion_votes_select" ON suggestion_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM poll_suggestions ps
      JOIN polls p ON p.id = ps.poll_id
      WHERE ps.id = suggestion_votes.suggestion_id
        AND is_planner_member(p.planner_id)
    )
  );

CREATE POLICY "suggestion_votes_insert" ON suggestion_votes
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM poll_suggestions ps
      JOIN polls p ON p.id = ps.poll_id
      WHERE ps.id = suggestion_votes.suggestion_id
        AND is_planner_editor_or_owner(p.planner_id)
    )
  );

CREATE POLICY "suggestion_votes_update" ON suggestion_votes
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM poll_suggestions ps
      JOIN polls p ON p.id = ps.poll_id
      WHERE ps.id = suggestion_votes.suggestion_id
        AND is_planner_editor_or_owner(p.planner_id)
    )
  );
