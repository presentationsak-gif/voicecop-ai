import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const signalsTable = pgTable("signals", {
  id: text("id").primaryKey(),
  junctionId: text("junction_id").notNull(),
  direction: text("direction", { enum: ["north", "south", "east", "west"] }).notNull(),
  state: text("state", { enum: ["red", "yellow", "green"] }).notNull().default("red"),
  duration: integer("duration").notNull().default(30),
  mode: text("mode", { enum: ["automatic", "manual", "emergency"] }).notNull().default("automatic"),
  lastChangedBy: text("last_changed_by"),
  lastChangedAt: timestamp("last_changed_at").notNull().defaultNow(),
});

export const insertSignalSchema = createInsertSchema(signalsTable).omit({ lastChangedAt: true });
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signalsTable.$inferSelect;
