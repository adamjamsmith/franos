CREATE TABLE "email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"email_id" uuid NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opened_at" timestamp with time zone,
	"first_clicked_at" timestamp with time zone,
	"clicks" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "email_sends_once" UNIQUE("client_id","lead_id","email_id")
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"key" text NOT NULL,
	"kind" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"day_offset" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emails_client_key" UNIQUE("client_id","key"),
	CONSTRAINT "emails_id_client" UNIQUE("id","client_id"),
	CONSTRAINT "emails_kind" CHECK ("emails"."kind" in ('prospectus', 'sequence'))
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "unsubscribed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_lead_id_client_id_leads_id_client_id_fk" FOREIGN KEY ("lead_id","client_id") REFERENCES "public"."leads"("id","client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_email_id_client_id_emails_id_client_id_fk" FOREIGN KEY ("email_id","client_id") REFERENCES "public"."emails"("id","client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_sends_sent" ON "email_sends" USING btree ("client_id","sent_at");