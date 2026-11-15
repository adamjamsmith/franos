ALTER TABLE "leads" ADD COLUMN "email_blocked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "email_blocked_reason" text;