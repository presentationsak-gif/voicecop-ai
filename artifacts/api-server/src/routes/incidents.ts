import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { incidentsTable, signalsTable, junctionsTable, alertsTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import { CreateIncidentBody, UpdateIncidentBody } from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const formatIncident = (i: typeof incidentsTable.$inferSelect, affectedSignals: string[]) => ({
  id: i.id,
  type: i.type,
  junctionId: i.junctionId,
  junctionName: i.junctionName,
  detectedBy: i.detectedBy,
  vehicleDirection: i.vehicleDirection ?? null,
  distanceMeters: i.distanceMeters ?? null,
  status: i.status,
  corridorActive: i.corridorActive,
  affectedSignals,
  resolvedAt: i.resolvedAt ? i.resolvedAt.toISOString() : null,
  createdAt: i.createdAt.toISOString(),
});

router.get("/incidents", async (_req, res) => {
  const incidents = await db.select().from(incidentsTable).orderBy(incidentsTable.createdAt);
  const signals = await db.select().from(signalsTable);

  const result = incidents.map((i) =>
    formatIncident(i, signals.filter((s) => s.junctionId === i.junctionId && s.mode === "emergency").map((s) => s.id))
  );

  res.json({ incidents: result });
});

router.post("/incidents", async (req, res) => {
  const body = CreateIncidentBody.parse(req.body);
  const id = randomUUID();
  const now = new Date();

  const [junction] = await db.select().from(junctionsTable).where(eq(junctionsTable.id, body.junctionId));
  const junctionName = junction?.name ?? "Unknown Junction";

  const [inserted] = await db
    .insert(incidentsTable)
    .values({
      id,
      type: body.type,
      junctionId: body.junctionId,
      junctionName,
      detectedBy: body.detectedBy,
      vehicleDirection: body.vehicleDirection ?? null,
      distanceMeters: body.distanceMeters ?? null,
      status: "alerting",
      corridorActive: false,
      createdAt: now,
    })
    .returning();

  // Create alert
  const vehicleNames: Record<string, string> = {
    ambulance: "Ambulance",
    fire_engine: "Fire Engine",
    police_vehicle: "Police Vehicle",
    accident: "Accident",
    roadblock: "Roadblock",
    emergency_corridor: "Emergency Corridor",
  };

  const distInfo = body.distanceMeters ? ` ${body.distanceMeters} meters away` : "";
  const dirInfo = body.vehicleDirection ? ` in ${body.vehicleDirection} lane` : "";
  const earpieceMsg = `${vehicleNames[body.type] ?? body.type} detected${distInfo}${dirInfo}. Recommend emergency corridor.`;

  await db.insert(alertsTable).values({
    id: randomUUID(),
    type: "emergency_vehicle",
    severity: "critical",
    junctionId: body.junctionId,
    junctionName,
    message: `${vehicleNames[body.type]} detected at ${junctionName}${distInfo}${dirInfo}`,
    earpieceMessage: earpieceMsg,
    acknowledged: false,
    createdAt: now,
  });

  res.status(201).json(formatIncident(inserted, []));
});

router.patch("/incidents/:incidentId", async (req, res) => {
  const { incidentId } = req.params;
  const body = UpdateIncidentBody.parse(req.body);

  const [existing] = await db.select().from(incidentsTable).where(eq(incidentsTable.id, incidentId));
  if (!existing) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  const now = new Date();
  const updateData: Partial<typeof incidentsTable.$inferInsert> = {};

  if (body.status) updateData.status = body.status;
  if (typeof body.corridorActive === "boolean") {
    updateData.corridorActive = body.corridorActive;

    if (body.corridorActive) {
      // Activate corridor: set vehicle direction to green, rest to red
      if (existing.vehicleDirection) {
        await db
          .update(signalsTable)
          .set({ state: "green", mode: "emergency", lastChangedAt: now })
          .where(eq(signalsTable.junctionId, existing.junctionId));
        // Cross-traffic stops
      }
      await db.update(junctionsTable).set({ status: "emergency", lastUpdated: now }).where(eq(junctionsTable.id, existing.junctionId));
    } else {
      await db.update(junctionsTable).set({ status: "normal", lastUpdated: now }).where(eq(junctionsTable.id, existing.junctionId));
    }
  }

  if (body.status === "resolved") {
    updateData.resolvedAt = now;
    await db.update(signalsTable)
      .set({ mode: "automatic", lastChangedAt: now })
      .where(eq(signalsTable.junctionId, existing.junctionId));
    await db.update(junctionsTable).set({ status: "normal", lastUpdated: now }).where(eq(junctionsTable.id, existing.junctionId));
  }

  const [updated] = await db.update(incidentsTable).set(updateData).where(eq(incidentsTable.id, incidentId)).returning();

  const signals = await db.select().from(signalsTable).where(eq(signalsTable.junctionId, existing.junctionId));
  res.json(formatIncident(updated, signals.filter((s) => s.mode === "emergency").map((s) => s.id)));
});

export default router;
