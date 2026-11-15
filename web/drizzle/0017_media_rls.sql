-- Locks for uploaded files. A file's record is only visible inside its own brand.
-- Everyone in a brand can see its files; only an owner can add or remove one.
-- The public pages fetch a file by its id through a trusted lookup, like the brand's own details.

ALTER TABLE media ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY media_select ON media FOR SELECT TO franos_app USING (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY media_insert ON media FOR INSERT TO franos_app WITH CHECK (client_id = app_client_id() AND app_role() = 'owner');
--> statement-breakpoint
CREATE POLICY media_delete ON media FOR DELETE TO franos_app USING (client_id = app_client_id() AND app_role() = 'owner');
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON media TO franos_app;
