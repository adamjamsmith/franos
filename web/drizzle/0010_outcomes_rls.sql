-- Locks for ad spend. Rows are only visible inside their own brand.
-- Everyone in a brand can read its spend; only an owner can type it in or change it.

ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY ad_spend_select ON ad_spend FOR SELECT TO franos_app USING (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY ad_spend_insert ON ad_spend FOR INSERT TO franos_app WITH CHECK (client_id = app_client_id() AND app_role() = 'owner');
--> statement-breakpoint
CREATE POLICY ad_spend_update ON ad_spend FOR UPDATE TO franos_app USING (client_id = app_client_id() AND app_role() = 'owner') WITH CHECK (client_id = app_client_id() AND app_role() = 'owner');
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON ad_spend TO franos_app;
