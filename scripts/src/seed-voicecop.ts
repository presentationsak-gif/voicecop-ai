import { db } from "@workspace/db";
import {
  junctionsTable,
  signalsTable,
  voiceCommandsTable,
  incidentsTable,
  alertsTable,
} from "@workspace/db";
import { randomUUID } from "crypto";

const junctions = [
  { id: "j1", name: "Anna Salai Central", location: "Anna Salai × Mount Road, Chennai", latitude: 13.0641, longitude: 80.2747, status: "normal" as const, congestionLevel: 72, cameraCount: 4, vehicleCount: 3240, activeOfficerId: "off1", officerName: "Sgt. Rajan Kumar" },
  { id: "j2", name: "T. Nagar Junction", location: "T. Nagar × Usman Road, Chennai", latitude: 13.0418, longitude: 80.2341, status: "congested" as const, congestionLevel: 91, cameraCount: 3, vehicleCount: 4120, activeOfficerId: "off2", officerName: "Sgt. Priya Sharma" },
  { id: "j3", name: "Adyar Signal", location: "Adyar × OMR, Chennai", latitude: 12.9890, longitude: 80.2551, status: "normal" as const, congestionLevel: 45, cameraCount: 2, vehicleCount: 1870, activeOfficerId: null, officerName: null },
  { id: "j4", name: "Vadapalani Flyover", location: "Vadapalani × Arcot Road, Chennai", latitude: 13.0524, longitude: 80.2122, status: "emergency" as const, congestionLevel: 88, cameraCount: 4, vehicleCount: 2950, activeOfficerId: "off3", officerName: "Sgt. Arjun Das" },
  { id: "j5", name: "Koyambedu Hub", location: "Koyambedu × NSK Salai, Chennai", latitude: 13.0710, longitude: 80.1955, status: "normal" as const, congestionLevel: 58, cameraCount: 3, vehicleCount: 2100, activeOfficerId: "off4", officerName: "Sgt. Meena Patel" },
  { id: "j6", name: "Tambaram Junction", location: "Tambaram × GST Road, Chennai", latitude: 12.9260, longitude: 80.1276, status: "normal" as const, congestionLevel: 33, cameraCount: 2, vehicleCount: 1340, activeOfficerId: null, officerName: null },
];

const directions = ["north", "south", "east", "west"] as const;

const signalSeeds = junctions.flatMap((j) =>
  directions.map((dir, i) => ({
    id: `sig-${j.id}-${dir}`,
    junctionId: j.id,
    direction: dir,
    state: (j.status === "emergency" ? (dir === "north" ? "green" : "red") : ["green", "red", "red", "yellow"][i % 4]) as "red" | "yellow" | "green",
    duration: [45, 30, 30, 5][i % 4],
    mode: (j.status === "emergency" ? "emergency" : "automatic") as "automatic" | "manual" | "emergency",
    lastChangedBy: j.activeOfficerId ?? null,
    lastChangedAt: new Date(Date.now() - Math.random() * 300000),
  }))
);

const commandSeeds = [
  { id: randomUUID(), officerId: "off1", officerName: "Sgt. Rajan Kumar", rawText: "North signal stop", intent: "signal_control" as const, targetDirection: "north" as const, targetState: "stop" as const, junctionId: "j1", status: "executed" as const, confidence: 0.96, language: "english" as const, aiResponse: "Confirmed. Setting North signal to RED (STOP). Command executing now.", executedAt: new Date(Date.now() - 180000) },
  { id: randomUUID(), officerId: "off2", officerName: "Sgt. Priya Sharma", rawText: "East lane go", intent: "signal_control" as const, targetDirection: "east" as const, targetState: "go" as const, junctionId: "j2", status: "executed" as const, confidence: 0.94, language: "english" as const, aiResponse: "Confirmed. Setting East signal to GREEN (GO). Command executing now.", executedAt: new Date(Date.now() - 120000) },
  { id: randomUUID(), officerId: "off3", officerName: "Sgt. Arjun Das", rawText: "Activate emergency corridor", intent: "emergency_corridor" as const, targetDirection: null, targetState: null, junctionId: "j4", status: "executed" as const, confidence: 0.99, language: "english" as const, aiResponse: "Emergency corridor activated. Clearing path for emergency vehicle. All cross-traffic signals set to red.", executedAt: new Date(Date.now() - 60000) },
  { id: randomUUID(), officerId: "off4", officerName: "Sgt. Meena Patel", rawText: "வடக்கு சிக்னல் நில்", intent: "signal_control" as const, targetDirection: "north" as const, targetState: "stop" as const, junctionId: "j5", status: "executed" as const, confidence: 0.91, language: "tamil" as const, aiResponse: "Confirmed. Setting North signal to RED (STOP). Command executing now.", executedAt: new Date(Date.now() - 30000) },
  { id: randomUUID(), officerId: "off1", officerName: "Sgt. Rajan Kumar", rawText: "South signal go", intent: "signal_control" as const, targetDirection: "south" as const, targetState: "go" as const, junctionId: "j1", status: "executed" as const, confidence: 0.95, language: "english" as const, aiResponse: "Confirmed. Setting South signal to GREEN (GO). Command executing now.", executedAt: new Date(Date.now() - 10000) },
];

const incidentSeeds = [
  { id: "inc1", type: "ambulance" as const, junctionId: "j4", junctionName: "Vadapalani Flyover", detectedBy: "ai_camera" as const, vehicleDirection: "north" as const, distanceMeters: 280, status: "corridor_active" as const, corridorActive: true, resolvedAt: null },
  { id: "inc2", type: "fire_engine" as const, junctionId: "j2", junctionName: "T. Nagar Junction", detectedBy: "officer_voice" as const, vehicleDirection: "east" as const, distanceMeters: 150, status: "alerting" as const, corridorActive: false, resolvedAt: null },
  { id: "inc3", type: "police_vehicle" as const, junctionId: "j1", junctionName: "Anna Salai Central", detectedBy: "ai_camera" as const, vehicleDirection: "south" as const, distanceMeters: 420, status: "detected" as const, corridorActive: false, resolvedAt: null },
];

const alertSeeds = [
  { id: randomUUID(), type: "emergency_vehicle" as const, severity: "critical" as const, junctionId: "j4", junctionName: "Vadapalani Flyover", message: "Ambulance detected 280 meters away in North lane at Vadapalani Flyover", earpieceMessage: "Ambulance detected 280 meters away in north lane. Recommend emergency corridor.", acknowledged: false },
  { id: randomUUID(), type: "congestion_high" as const, severity: "warning" as const, junctionId: "j2", junctionName: "T. Nagar Junction", message: "High congestion alert: T. Nagar Junction at 91% capacity. 4120 vehicles in queue.", earpieceMessage: "High congestion at T. Nagar Junction. 91% capacity. Consider signal optimization.", acknowledged: false },
  { id: randomUUID(), type: "emergency_vehicle" as const, severity: "critical" as const, junctionId: "j2", junctionName: "T. Nagar Junction", message: "Fire Engine detected 150 meters away in East lane at T. Nagar Junction", earpieceMessage: "Fire Engine detected 150 meters away in east lane. Emergency corridor required.", acknowledged: false },
  { id: randomUUID(), type: "system_alert" as const, severity: "info" as const, junctionId: null, junctionName: null, message: "VoiceCop AI system online. All 6 junctions monitored. Voice recognition active.", earpieceMessage: "System ready. VoiceCop AI is now monitoring all junctions.", acknowledged: true },
  { id: randomUUID(), type: "congestion_high" as const, severity: "warning" as const, junctionId: "j4", junctionName: "Vadapalani Flyover", message: "Congestion at 88% — emergency corridor active. Vehicle flow being managed.", earpieceMessage: "Congestion update at Vadapalani. Emergency corridor is active.", acknowledged: true },
];

async function seed() {
  console.log("🌱 Seeding VoiceCop AI data...");

  await db.delete(alertsTable);
  await db.delete(incidentsTable);
  await db.delete(voiceCommandsTable);
  await db.delete(signalsTable);
  await db.delete(junctionsTable);

  await db.insert(junctionsTable).values(junctions.map((j) => ({ ...j, lastUpdated: new Date() })));
  console.log(`✓ ${junctions.length} junctions`);

  await db.insert(signalsTable).values(signalSeeds);
  console.log(`✓ ${signalSeeds.length} signals`);

  await db.insert(voiceCommandsTable).values(commandSeeds.map((c) => ({ ...c, createdAt: c.executedAt ?? new Date() })));
  console.log(`✓ ${commandSeeds.length} voice commands`);

  await db.insert(incidentsTable).values(incidentSeeds.map((i) => ({ ...i, createdAt: new Date(Date.now() - 300000) })));
  console.log(`✓ ${incidentSeeds.length} incidents`);

  await db.insert(alertsTable).values(alertSeeds.map((a) => ({ ...a, createdAt: new Date(Date.now() - Math.random() * 600000) })));
  console.log(`✓ ${alertSeeds.length} alerts`);

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
