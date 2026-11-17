CREATE TABLE "user_calendars" (
	"user_id" text PRIMARY KEY NOT NULL,
	"feed" text NOT NULL,
	"busy" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_calendars" ADD CONSTRAINT "user_calendars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;