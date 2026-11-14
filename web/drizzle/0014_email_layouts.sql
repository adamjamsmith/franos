ALTER TABLE "emails" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "layout" text DEFAULT 'header' NOT NULL;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "preview" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "video_id" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "quote" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "quote_by" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "show_ps" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Reactions and nudges read as typed by the consultant.
UPDATE "emails" SET "layout" = 'personal' WHERE "kind" IN ('reaction', 'nudge');
