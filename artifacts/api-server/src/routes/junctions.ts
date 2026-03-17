import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { junctionsTable, signalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/junctions", async (_req, res) => {
  const junctions = await db.select().from(junctionsTable).orderBy(junctionsTable.name);
  const signals = await db.select().from(signalsTable);

  const result = junctions.map((j) => ({
    id: j.id,
    name: j.name,
    location: j.location,
    latitude: j.latitude,
    longitude: j.longitude,
    status: j.status,
    congestionLevel: j.congestionLevel,
    activeOfficerId: j.activeOfficerId ?? null,
    officerName: j.officerName ?? null,
    signalIds: signals.filter((s) => s.junctionId === j.id).map((s) => s.id),
    cameraCount: j.cameraCount,
    vehicleCount: j.vehicleCount,
    lastUpdated: j.lastUpdated.toISOString(),
  }));

  res.json({ junctions: result });
});

router.get("/junctions/:junctionId", async (req, res) => {
  const { junctionId } = req.params;
  const [junction] = await db.select().from(junctionsTable).where(eq(junctionsTable.id, junctionId));

  if (!junction) {
    res.status(404).json({ error: "Junction not found" });
    return;
  }

  const signals = await db.select().from(signalsTable).where(eq(signalsTable.junctionId, junctionId));

  res.json({
    id: junction.id,
    name: junction.name,
    location: junction.location,
    latitude: junction.latitude,
    longitude: junction.longitude,
    status: junction.status,
    congestionLevel: junction.congestionLevel,
    activeOfficerId: junction.activeOfficerId ?? null,
    officerName: junction.officerName ?? null,
    signalIds: signals.map((s) => s.id),
    cameraCount: junction.cameraCount,
    vehicleCount: junction.vehicleCount,
    lastUpdated: junction.lastUpdated.toISOString(),
  });
});

export default router;
