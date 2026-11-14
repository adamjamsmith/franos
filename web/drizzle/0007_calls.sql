CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'booked' NOT NULL,
	"booked_by" text DEFAULT 'lead' NOT NULL,
	"meeting_id" text,
	"meeting_url" text,
	"duration_minutes" integer,
	"recording_url" text,
	"transcript" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calls_status" CHECK ("calls"."status" in ('booked', 'cancelled', 'attended', 'no_show')),
	CONSTRAINT "calls_booked_by" CHECK ("calls"."booked_by" in ('lead', 'staff'))
);
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_lead_id_client_id_leads_id_client_id_fk" FOREIGN KEY ("lead_id","client_id") REFERENCES "public"."leads"("id","client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calls_slot" ON "calls" USING btree ("client_id","starts_at") WHERE "calls"."status" <> 'cancelled';--> statement-breakpoint
CREATE INDEX "calls_lead" ON "calls" USING btree ("lead_id","starts_at");