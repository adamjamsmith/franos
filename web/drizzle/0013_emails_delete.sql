-- An owner can delete an email, so a sequence email added by mistake can be removed.
-- The app only offers this for an email that has never been sent; the send records point at
-- their email, so the database refuses to delete one that has.

CREATE POLICY emails_delete ON emails FOR DELETE TO franos_app USING (client_id = app_client_id() AND app_role() = 'owner');
--> statement-breakpoint
GRANT DELETE ON emails TO franos_app;
