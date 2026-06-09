CREATE TABLE "songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"artist" varchar(255) NOT NULL,
	"genre" varchar(100),
	"embedding" vector(5) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
