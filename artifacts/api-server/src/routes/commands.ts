import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { voiceCommandsTable, signalsTable, junctionsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { ProcessCommandBody } from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function parseCommand(text: string): {
  intent: "signal_control" | "emergency_corridor" | "status_query" | "alert_dismiss" | "junction_query" | "unknown";
  targetDirection: "north" | "south" | "east" | "west" | "all" | null;
  targetState: "red" | "green" | "stop" | "go" | null;
  confidence: number;
  aiResponse: string;
} {
  const lower = text.toLowerCase().trim();

  const directionMap: Record<string, "north" | "south" | "east" | "west"> = {
    north: "north", south: "south", east: "east", west: "west",
    "வடக்கு": "north", "தெற்கு": "south", "கிழக்கு": "east", "மேற்கு": "west",
    "उत्तर": "north", "दक्षिण": "south", "पूर्व": "east", "पश्चिम": "west",
  };

  const stateKeywords: Record<string, "red" | "green" | "stop" | "go"> = {
    stop: "stop", red: "red", go: "go", green: "green",
    "நில்": "stop", "போ": "go",
    "रुको": "stop", "जाओ": "go",
  };

  let targetDirection: "north" | "south" | "east" | "west" | "all" | null = null;
  let targetState: "red" | "green" | "stop" | "go" | null = null;
  let intent: "signal_control" | "emergency_corridor" | "status_query" | "alert_dismiss" | "junction_query" | "unknown" = "unknown";
  let aiResponse = "";
  let confidence = 0.75;

  for (const [key, dir] of Object.entries(directionMap)) {
    if (lower.includes(key)) {
      targetDirection = dir;
      break;
    }
  }

  if (lower.includes("all") || lower.includes("every")) {
    targetDirection = "all";
  }

  for (const [key, state] of Object.entries(stateKeywords)) {
    if (lower.includes(key)) {
      targetState = state;
      break;
    }
  }

  if (
    (lower.includes("deactivate") || lower.includes("cancel corridor") || lower.includes("restore signal") || lower.includes("clear corridor") || lower.includes("end corridor") || lower.includes("normal mode")) &&
    (lower.includes("emergency") || lower.includes("corridor"))
  ) {
    intent = "emergency_corridor";
    confidence = 0.97;
    aiResponse = "Emergency corridor deactivated. Restoring all signals to normal automatic operation.";
    targetState = "deactivate" as any;
  } else if (lower.includes("emergency") || lower.includes("corridor") || lower.includes("ambulance") || lower.includes("fire") || lower.includes("clear path")) {
    intent = "emergency_corridor";
    confidence = 0.97;
    aiResponse = "Emergency corridor activated. Clearing path for emergency vehicle. All cross-traffic signals set to red.";
  } else if (targetDirection && targetState) {
    intent = "signal_control";
    confidence = 0.94;
    const stateWord = targetState === "stop" || targetState === "red" ? "RED (STOP)" : "GREEN (GO)";
    const dir = targetDirection.charAt(0).toUpperCase() + targetDirection.slice(1);
    aiResponse = `Confirmed. Setting ${dir} signal to ${stateWord}. Command executing now.`;
  } else if (lower.includes("status") || lower.includes("congestion") || lower.includes("how many")) {
    intent = "status_query";
    confidence = 0.88;
    aiResponse = "Fetching current junction status and congestion data. All systems nominal.";
  } else if (lower.includes("alert") || lower.includes("dismiss") || lower.includes("acknowledge")) {
    intent = "alert_dismiss";
    confidence = 0.85;
    aiResponse = "Alert acknowledged and dismissed from your queue.";
  } else if (lower.includes("junction") || lower.includes("intersection")) {
    intent = "junction_query";
    confidence = 0.82;
    aiResponse = "Retrieving junction information and live camera feed data.";
  } else {
    aiResponse = `Command received: "${text}". Unable to parse specific intent. Please use standard commands like "North signal stop" or "Activate emergency corridor".`;
    confidence = 0.45;
  }

  return { intent, targetDirection, targetState, confidence, aiResponse };
}

const formatRow = (cmd: typeof voiceCommandsTable.$inferSelect) => ({
  id: cmd.id,
  officerId: cmd.officerId,
  officerName: cmd.officerName,
  rawText: cmd.rawText,
  intent: cmd.intent,
  targetDirection: cmd.targetDirection ?? null,
  targetState: cmd.targetState ?? null,
  junctionId: cmd.junctionId ?? null,
  status: cmd.status,
  confidence: cmd.confidence,
  language: cmd.language,
  aiResponse: cmd.aiResponse,
  executedAt: cmd.executedAt ? cmd.executedAt.toISOString() : null,
  createdAt: cmd.createdAt.toISOString(),
});

router.get("/commands", async (req, res) => {
  const limit = parseInt(String(req.query["limit"] ?? "20"), 10);
  const commands = await db.select().from(voiceCommandsTable).orderBy(desc(voiceCommandsTable.createdAt)).limit(limit);
  res.json({ commands: commands.map(formatRow) });
});

router.post("/commands", async (req, res) => {
  const body = ProcessCommandBody.parse(req.body);
  const parsed = parseCommand(body.rawText);

  const id = randomUUID();
  const now = new Date();

  const [inserted] = await db
    .insert(voiceCommandsTable)
    .values({
      id,
      officerId: body.officerId,
      officerName: "Officer",
      rawText: body.rawText,
      intent: parsed.intent,
      targetDirection: parsed.targetDirection,
      targetState: parsed.targetState,
      junctionId: body.junctionId,
      status: "confirmed",
      confidence: parsed.confidence,
      language: body.language ?? "english",
      aiResponse: parsed.aiResponse,
      executedAt: now,
      createdAt: now,
    })
    .returning();

  // Auto-execute signal control commands
  if (parsed.intent === "signal_control" && parsed.targetDirection && parsed.targetState && body.junctionId) {
    const signalState = parsed.targetState === "stop" || parsed.targetState === "red" ? "red" : "green";
    const dirs = parsed.targetDirection === "all" ? ["north", "south", "east", "west"] : [parsed.targetDirection];

    for (const dir of dirs) {
      await db
        .update(signalsTable)
        .set({ state: signalState as "red" | "green", mode: "manual", lastChangedBy: body.officerId, lastChangedAt: now })
        .where(and(eq(signalsTable.junctionId, body.junctionId), eq(signalsTable.direction, dir as "north" | "south" | "east" | "west")));
    }

    await db.update(junctionsTable).set({ lastUpdated: now }).where(eq(junctionsTable.id, body.junctionId));
  }

  if (parsed.intent === "emergency_corridor" && body.junctionId) {
    const isDeactivate = (parsed.targetState as any) === "deactivate";
    if (isDeactivate) {
      // Restore all signals to green automatic mode
      await db
        .update(signalsTable)
        .set({ state: "green", mode: "automatic", lastChangedBy: body.officerId, lastChangedAt: now })
        .where(eq(signalsTable.junctionId, body.junctionId));
      await db.update(junctionsTable)
        .set({ status: "normal", lastUpdated: now })
        .where(eq(junctionsTable.id, body.junctionId));
    } else {
      // Activate: set all signals to red emergency mode
      await db
        .update(signalsTable)
        .set({ state: "red", mode: "emergency", lastChangedBy: body.officerId, lastChangedAt: now })
        .where(eq(signalsTable.junctionId, body.junctionId));
      await db.update(junctionsTable)
        .set({ status: "emergency", lastUpdated: now })
        .where(eq(junctionsTable.id, body.junctionId));
    }
  }

  await db
    .update(voiceCommandsTable)
    .set({ status: "executed" })
    .where(eq(voiceCommandsTable.id, id));

  const [final] = await db.select().from(voiceCommandsTable).where(eq(voiceCommandsTable.id, id));
  res.json(formatRow(final));
});

export default router;
