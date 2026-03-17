import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { junctionsTable, voiceCommandsTable, incidentsTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/analytics/overview", async (_req, res) => {
  const junctions = await db.select().from(junctionsTable);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCommands = await db.select().from(voiceCommandsTable).where(gte(voiceCommandsTable.createdAt, today));
  const todayIncidents = await db.select().from(incidentsTable).where(gte(incidentsTable.createdAt, today));
  const activeOfficers = new Set(junctions.filter((j) => j.activeOfficerId).map((j) => j.activeOfficerId)).size;

  const totalVehicles = junctions.reduce((sum, j) => sum + j.vehicleCount, 0);

  res.json({
    totalJunctions: junctions.length,
    activeOfficers,
    emergencyIncidentsToday: todayIncidents.length,
    avgResponseTimeSeconds: 12,
    vehiclesProcessedToday: totalVehicles + todayCommands.length * 45,
    congestionReductionPercent: 34,
    commandsExecutedToday: todayCommands.length,
    uptime: 99.7,
  });
});

router.get("/analytics/congestion", async (_req, res) => {
  const junctions = await db.select().from(junctionsTable);

  const data = junctions.flatMap((j) =>
    Array.from({ length: 24 }, (_, hour) => ({
      junctionId: j.id,
      junctionName: j.name,
      hour,
      congestionLevel: Math.round(
        j.congestionLevel * (0.3 + 0.7 * Math.sin((hour - 8) * (Math.PI / 12)) * Math.max(0, Math.sin((hour - 8) * (Math.PI / 12))))
      ),
      vehicleCount: Math.round(j.vehicleCount * (0.2 + 0.8 * Math.abs(Math.sin((hour - 9) * (Math.PI / 12))))),
    }))
  );

  res.json({ data });
});

export default router;
