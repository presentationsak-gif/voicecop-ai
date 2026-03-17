import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { signalsTable, junctionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSignalBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/signals", async (_req, res) => {
  const signals = await db.select().from(signalsTable);
  res.json({
    signals: signals.map((s) => ({
      ...s,
      lastChangedBy: s.lastChangedBy ?? null,
      lastChangedAt: s.lastChangedAt.toISOString(),
    })),
  });
});

router.patch("/signals/:signalId", async (req, res) => {
  const { signalId } = req.params;
  const body = UpdateSignalBody.parse(req.body);

  const [existing] = await db.select().from(signalsTable).where(eq(signalsTable.id, signalId));
  if (!existing) {
    res.status(404).json({ error: "Signal not found" });
    return;
  }

  const [updated] = await db
    .update(signalsTable)
    .set({
      ...(body.state ? { state: body.state } : {}),
      ...(body.duration ? { duration: body.duration } : {}),
      ...(body.mode ? { mode: body.mode } : {}),
      lastChangedBy: body.officerId ?? null,
      lastChangedAt: new Date(),
    })
    .where(eq(signalsTable.id, signalId))
    .returning();

  // update junction lastUpdated
  await db
    .update(junctionsTable)
    .set({ lastUpdated: new Date() })
    .where(eq(junctionsTable.id, existing.junctionId));

  res.json({
    ...updated,
    lastChangedBy: updated.lastChangedBy ?? null,
    lastChangedAt: updated.lastChangedAt.toISOString(),
  });
});

export default router;
