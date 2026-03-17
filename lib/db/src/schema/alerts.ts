import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertsTable = pgTable("alerts", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["emergency_vehicle", "congestion_high", "signal_fault", "officer_alert", "system_alert"] }).notNull(),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull(),
  junctionId: text("junction_id"),
  junctionName: text("junction_name"),
  message: text("message").notNull(),
  earpieceMessage: text("earpiece_message"),
  acknowledged: boolean("acknowledged").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
