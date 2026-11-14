-- Locks for the Step 1 tables. Same rule as before: rows are only visible inside their own brand.
-- The public pages run as the app role with app.role = 'site' and one brand set, so they can add
-- leads, events and counts for that brand and nothing else.

ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE meta_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY site_stats_all ON site_stats FOR ALL TO franos_app USING (client_id = app_client_id()) WITH CHECK (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY meta_events_select ON meta_events FOR SELECT TO franos_app USING (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY meta_events_insert ON meta_events FOR INSERT TO franos_app WITH CHECK (client_id = app_client_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON site_stats TO franos_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON meta_events TO franos_app;
--> statement-breakpoint

-- The public pages must never read people, memberships or the audit log, or change a brand's settings.
DROP POLICY users_select ON users;
--> statement-breakpoint
CREATE POLICY users_select ON users FOR SELECT TO franos_app
  USING (
    app_role() = 'owner'
    OR id = app_user_id()
    OR (app_role() IN ('client', 'consultant') AND EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = users.id AND m.client_id = app_client_id()))
  );
--> statement-breakpoint
DROP POLICY memberships_select ON memberships;
--> statement-breakpoint
CREATE POLICY memberships_select ON memberships FOR SELECT TO franos_app
  USING (
    app_role() = 'owner'
    OR user_id = app_user_id()
    OR (app_role() IN ('client', 'consultant') AND client_id = app_client_id())
  );
--> statement-breakpoint
DROP POLICY audit_insert ON audit_log;
--> statement-breakpoint
CREATE POLICY audit_insert ON audit_log FOR INSERT TO franos_app
  WITH CHECK (client_id = app_client_id() AND app_role() IN ('owner', 'client', 'consultant'));
