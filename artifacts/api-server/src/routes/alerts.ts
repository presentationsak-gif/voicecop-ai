import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/alerts", async (_req, res) => {
  const alerts = await db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt)).limit(50);
  res.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      junctionId: a.junctionId ?? null,
      junctionName: a.junctionName ?? null,
      message: a.message,
      earpieceMessage: a.earpieceMessage ?? null,
      acknowledged: a.acknowledged,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

export default router;
