CREATE TABLE "recording_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'booked' NOT NULL,
	"meeting_id" text,
	"meeting_url" text,
	"duration_minutes" integer,
	"recording_url" text,
	"transcript" text,
	"sound_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"consent_wording" text NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recording_sessions_kind" CHECK ("recording_sessions"."kind" in ('testimonial', 'franchisor', 'other')),
	CONSTRAINT "recording_sessions_status" CHECK ("recording_sessions"."status" in ('booked', 'cancelled', 'happened', 'no_show', 'needs_look'))
);
--> statement-breakpoint
ALTER TABLE "recording_sessions" ADD CONSTRAINT "recording_sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recording_sessions_slot" ON "recording_sessions" USING btree ("starts_at") WHERE "recording_sessions"."status" <> 'cancelled';--> statement-breakpoint
CREATE INDEX "recording_sessions_client" ON "recording_sessions" USING btree ("client_id","starts_at");