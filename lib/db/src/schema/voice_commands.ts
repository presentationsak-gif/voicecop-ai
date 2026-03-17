import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const voiceCommandsTable = pgTable("voice_commands", {
  id: text("id").primaryKey(),
  officerId: text("officer_id").notNull(),
  officerName: text("officer_name").notNull(),
  rawText: text("raw_text").notNull(),
  intent: text("intent", { enum: ["signal_control", "emergency_corridor", "status_query", "alert_dismiss", "junction_query", "unknown"] }).notNull().default("unknown"),
  targetDirection: text("target_direction", { enum: ["north", "south", "east", "west", "all"] }),
  targetState: text("target_state", { enum: ["red", "green", "stop", "go"] }),
  junctionId: text("junction_id"),
  status: text("status", { enum: ["pending", "confirmed", "executed", "rejected"] }).notNull().default("pending"),
  confidence: real("confidence").notNull().default(0.9),
  language: text("language", { enum: ["english", "tamil", "hindi"] }).notNull().default("english"),
  aiResponse: text("ai_response").notNull().default(""),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVoiceCommandSchema = createInsertSchema(voiceCommandsTable).omit({ createdAt: true });
export type InsertVoiceCommand = z.infer<typeof insertVoiceCommandSchema>;
export type VoiceCommand = typeof voiceCommandsTable.$inferSelect;
