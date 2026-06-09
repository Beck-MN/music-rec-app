import { pgTable, serial, varchar, timestamp, vector } from "drizzle-orm/pg-core";

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }).notNull(),
  genre: varchar("genre", { length: 100 }),
  embedding: vector("embedding", { dimensions: 5 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
