ALTER TABLE "songs" ADD COLUMN "primary_genre" varchar(100);--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "subgenres" jsonb DEFAULT '[]'::jsonb NOT NULL;