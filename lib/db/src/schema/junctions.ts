import { pgTable, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const junctionsTable = pgTable("junctions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  status: text("status", { enum: ["normal", "congested", "emergency", "offline"] }).notNull().default("normal"),
  congestionLevel: integer("congestion_level").notNull().default(0),
  activeOfficerId: text("active_officer_id"),
  officerName: text("officer_name"),
  cameraCount: integer("camera_count").notNull().default(2),
  vehicleCount: integer("vehicle_count").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertJunctionSchema = createInsertSchema(junctionsTable).omit({ lastUpdated: true });
export type InsertJunction = z.infer<typeof insertJunctionSchema>;
export type Junction = typeof junctionsTable.$inferSelect;
