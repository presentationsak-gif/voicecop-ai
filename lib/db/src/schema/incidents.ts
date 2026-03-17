import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const incidentsTable = pgTable("incidents", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["ambulance", "fire_engine", "police_vehicle", "accident", "roadblock", "emergency_corridor"] }).notNull(),
  junctionId: text("junction_id").notNull(),
  junctionName: text("junction_name").notNull(),
  detectedBy: text("detected_by", { enum: ["ai_camera", "officer_voice", "control_room", "manual"] }).notNull(),
  vehicleDirection: text("vehicle_direction", { enum: ["north", "south", "east", "west"] }),
  distanceMeters: integer("distance_meters"),
  status: text("status", { enum: ["detected", "alerting", "corridor_active", "resolved"] }).notNull().default("detected"),
  corridorActive: boolean("corridor_active").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({ createdAt: true });
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidentsTable.$inferSelect;
