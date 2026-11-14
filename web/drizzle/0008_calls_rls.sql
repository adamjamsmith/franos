-- Locks for the calls table. Rows are only visible inside their own brand.
-- Everyone in a brand can read its calls. The public pages (app.role = 'site'), owners and
-- consultants can book and change them. The client role can only read.

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY calls_select ON calls FOR SELECT TO franos_app USING (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY calls_insert ON calls FOR INSERT TO franos_app WITH CHECK (client_id = app_client_id() AND app_role() IN ('site', 'owner', 'consultant'));
--> statement-breakpoint
CREATE POLICY calls_update ON calls FOR UPDATE TO franos_app USING (client_id = app_client_id() AND app_role() IN ('site', 'owner', 'consultant')) WITH CHECK (client_id = app_client_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON calls TO franos_app;
