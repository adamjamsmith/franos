ALTER TABLE "recording_sessions" DROP CONSTRAINT "recording_sessions_kind";--> statement-breakpoint
ALTER TABLE "recording_sessions" ADD COLUMN "keep_video" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "recording_sessions" ADD CONSTRAINT "recording_sessions_kind" CHECK ("recording_sessions"."kind" in ('testimonial', 'franchisor', 'other', 'meeting'));