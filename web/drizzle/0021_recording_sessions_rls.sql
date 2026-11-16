-- Locks for recording sessions. Rows are only visible inside their own brand, and only to the owner
-- and to the public pages (app.role = 'site'), which book them and show a person their own booking.
-- Consultants and clients see nothing.

ALTER TABLE recording_sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY recording_sessions_select ON recording_sessions FOR SELECT TO franos_app USING (client_id = app_client_id() AND app_role() IN ('site', 'owner'));
--> statement-breakpoint
CREATE POLICY recording_sessions_insert ON recording_sessions FOR INSERT TO franos_app WITH CHECK (client_id = app_client_id() AND app_role() IN ('site', 'owner'));
--> statement-breakpoint
CREATE POLICY recording_sessions_update ON recording_sessions FOR UPDATE TO franos_app USING (client_id = app_client_id() AND app_role() IN ('site', 'owner')) WITH CHECK (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY recording_sessions_delete ON recording_sessions FOR DELETE TO franos_app USING (client_id = app_client_id() AND app_role() = 'owner');
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON recording_sessions TO franos_app;
--> statement-breakpoint

-- One person hosts every session, and (until the consultant has a Zoom seat) every lead call too.
-- These two hand back times only, across every brand, so a booking in one brand can avoid a clash in another.
CREATE FUNCTION session_busy_times(since timestamptz) RETURNS TABLE (id uuid, starts_at timestamptz, ends_at timestamptz)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT id, starts_at, ends_at FROM recording_sessions WHERE status <> 'cancelled' AND ends_at >= since $$;
--> statement-breakpoint
CREATE FUNCTION call_busy_times(since timestamptz) RETURNS TABLE (id uuid, starts_at timestamptz, ends_at timestamptz)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT id, starts_at, ends_at FROM calls WHERE status <> 'cancelled' AND ends_at >= since $$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION session_busy_times(timestamptz) TO franos_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION call_busy_times(timestamptz) TO franos_app;
