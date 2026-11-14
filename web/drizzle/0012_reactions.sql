ALTER TABLE "emails" DROP CONSTRAINT "emails_kind";--> statement-breakpoint
ALTER TABLE "email_sends" ADD COLUMN "unsubscribed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "trigger" text;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_kind" CHECK ("emails"."kind" in ('prospectus', 'sequence', 'reaction', 'nudge'));