-- The second lock on client separation.
-- The app connects as franos_app, which can only ever see rows for the brand set in app.client_id.
-- The jobs runner connects as franos_worker, which can only see the jobs table.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'franos_app') THEN CREATE ROLE franos_app NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'franos_worker') THEN CREATE ROLE franos_worker NOLOGIN; END IF;
END $$;
--> statement-breakpoint
CREATE FUNCTION app_client_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.client_id', true), '')::uuid $$;
--> statement-breakpoint
CREATE FUNCTION app_role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('app.role', true), ''), 'none') $$;
--> statement-breakpoint
CREATE FUNCTION app_user_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id', true), '') $$;
--> statement-breakpoint
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- clients: an owner sees every brand; anyone else sees only the brand they are working in. Only owners add or change brands.
CREATE POLICY clients_select ON clients FOR SELECT TO franos_app USING (app_role() = 'owner' OR id = app_client_id());
--> statement-breakpoint
CREATE POLICY clients_insert ON clients FOR INSERT TO franos_app WITH CHECK (app_role() = 'owner');
--> statement-breakpoint
CREATE POLICY clients_update ON clients FOR UPDATE TO franos_app USING (app_role() = 'owner') WITH CHECK (app_role() = 'owner');
--> statement-breakpoint

-- memberships: visible inside the current brand, to owners, and to the user they belong to (for the brand switcher).
CREATE POLICY memberships_select ON memberships FOR SELECT TO franos_app
  USING (app_role() = 'owner' OR client_id = app_client_id() OR user_id = app_user_id());
--> statement-breakpoint
CREATE POLICY memberships_insert ON memberships FOR INSERT TO franos_app
  WITH CHECK (app_role() = 'owner' OR (app_role() = 'client' AND client_id = app_client_id()));
--> statement-breakpoint
CREATE POLICY memberships_delete ON memberships FOR DELETE TO franos_app
  USING (app_role() = 'owner' OR (app_role() = 'client' AND client_id = app_client_id()));
--> statement-breakpoint

-- users: yourself, people in the brand you are working in, or everyone if you are an owner.
CREATE POLICY users_select ON users FOR SELECT TO franos_app
  USING (
    app_role() = 'owner'
    OR id = app_user_id()
    OR EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = users.id AND m.client_id = app_client_id())
  );
--> statement-breakpoint
CREATE POLICY users_insert ON users FOR INSERT TO franos_app WITH CHECK (app_role() IN ('owner', 'client'));
--> statement-breakpoint

-- leads: everyone in the brand can see, add and update. Consultants cannot delete.
CREATE POLICY leads_select ON leads FOR SELECT TO franos_app USING (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY leads_insert ON leads FOR INSERT TO franos_app WITH CHECK (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY leads_update ON leads FOR UPDATE TO franos_app USING (client_id = app_client_id()) WITH CHECK (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY leads_delete ON leads FOR DELETE TO franos_app USING (client_id = app_client_id() AND app_role() IN ('owner', 'client'));
--> statement-breakpoint

-- lead_events and consents: add and read only. History is never edited.
CREATE POLICY lead_events_select ON lead_events FOR SELECT TO franos_app USING (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY lead_events_insert ON lead_events FOR INSERT TO franos_app WITH CHECK (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY consents_select ON consents FOR SELECT TO franos_app USING (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY consents_insert ON consents FOR INSERT TO franos_app WITH CHECK (client_id = app_client_id());
--> statement-breakpoint

-- jobs: the app works inside one brand; the runner sees every brand's jobs and nothing else.
CREATE POLICY jobs_app ON jobs FOR ALL TO franos_app USING (client_id = app_client_id()) WITH CHECK (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY jobs_worker ON jobs FOR ALL TO franos_worker USING (true) WITH CHECK (true);
--> statement-breakpoint

-- audit_log: anyone can add a line for their brand; only owners and the brand's client can read it. Never changed.
CREATE POLICY audit_insert ON audit_log FOR INSERT TO franos_app WITH CHECK (client_id = app_client_id());
--> statement-breakpoint
CREATE POLICY audit_select ON audit_log FOR SELECT TO franos_app USING (client_id = app_client_id() AND app_role() IN ('owner', 'client'));
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON clients TO franos_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON users TO franos_app;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON memberships TO franos_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO franos_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON lead_events, consents, audit_log TO franos_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON jobs TO franos_app;
--> statement-breakpoint
GRANT SELECT, UPDATE ON jobs TO franos_worker;
--> statement-breakpoint
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO franos_app;
