-- Lets franOS mark a Meta event as sent or failed after trying to send it.
-- As with reading and adding them, an event can only be changed inside its own brand.

CREATE POLICY meta_events_update ON meta_events FOR UPDATE TO franos_app USING (client_id = app_client_id()) WITH CHECK (client_id = app_client_id());
--> statement-breakpoint
GRANT UPDATE ON meta_events TO franos_app;
