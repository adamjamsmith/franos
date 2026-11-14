-- Locks for the email tables. Rows are only visible inside their own brand.
-- Everyone in a brand can read its emails; only an owner can add or change them.
-- The public pages and the sender (app.role = 'site') can record sends, opens and clicks.

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY emails_select ON emails FOR SELECT TO franos_app USING (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY emails_insert ON emails FOR INSERT TO franos_app WITH CHECK (client_id = app_client_id() AND app_role() = 'owner');
--> statement-breakpoint
CREATE POLICY emails_update ON emails FOR UPDATE TO franos_app USING (client_id = app_client_id() AND app_role() = 'owner') WITH CHECK (client_id = app_client_id() AND app_role() = 'owner');
--> statement-breakpoint
CREATE POLICY email_sends_select ON email_sends FOR SELECT TO franos_app USING (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY email_sends_insert ON email_sends FOR INSERT TO franos_app WITH CHECK (client_id = app_client_id() AND app_role() IN ('site', 'owner'));
--> statement-breakpoint
CREATE POLICY email_sends_update ON email_sends FOR UPDATE TO franos_app USING (client_id = app_client_id() AND app_role() IN ('site', 'owner')) WITH CHECK (client_id = app_client_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON emails, email_sends TO franos_app;
