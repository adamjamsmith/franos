CREATE TABLE "ad_spend" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"month" text NOT NULL,
	"amount_pence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ad_spend_client_month" UNIQUE("client_id","month")
);
--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "outcome" jsonb;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "good_call" boolean;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "outcome_reason" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "outcome_note" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "outcome_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ad_spend" ADD CONSTRAINT "ad_spend_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;