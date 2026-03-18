import { useState, useCallback, useEffect, Component, type ReactNode } from "react";
import { AppLayout } from "@/components/layout";
import { Intersection3D } from "@/components/intersection-3d";
import { Intersection2DFallback } from "@/components/intersection-2d-fallback";
import { CameraDetection, type DetectedVehicle } from "@/components/camera-detection";
import { useListJunctions, useListSignals, useProcessCommand } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTrafficPolling } from "@/hooks/use-polling";
import { ShieldAlert, ShieldOff, Radio, Zap, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

type SignalState = "red" | "yellow" | "green";

interface SignalStates {
  north: SignalState;
  south: SignalState;
  east: SignalState;
  west: SignalState;
}

export default function SurveillancePage() {
  useTrafficPolling(3000);

  const [selectedJunctionId, setSelectedJunctionId] = useState<string>("");
  const [detectedVehicle, setDetectedVehicle] = useState<DetectedVehicle>(null);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [corridorLog, setCorridorLog] = useState<{ msg: string; time: string; type: "activate" | "deactivate" | "detect" }[]>([]);

  const queryClient = useQueryClient();
  const { data: junctionsData } = useListJunctions();
  const { data: signalsData } = useListSignals();

  const processCmd = useProcessCommand({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
        queryClient.invalidateQueries({ queryKey: ["/api/junctions"] });
      },
    },
  });

  const junctions = junctionsData?.junctions ?? [];

  useEffect(() => {
    if (junctions.length > 0 && !selectedJunctionId) {
      setSelectedJunctionId(junctions[0].id);
    }
  }, [junctions, selectedJunctionId]);

  const signalStates: SignalStates = (() => {
    const defaults: SignalStates = { north: "red", south: "red", east: "red", west: "red" };
    if (!signalsData || !selectedJunctionId) return defaults;
    signalsData.signals
      .filter((s) => s.junctionId === selectedJunctionId)
      .forEach((s) => {
        const dir = s.direction as keyof SignalStates;
        if (dir in defaults) defaults[dir] = s.state as SignalState;
      });
    return defaults;
  })();

  const selectedJunction = junctions.find((j) => j.id === selectedJunctionId);
  const isEmergencyJunction = selectedJunction?.status === "emergency";

  useEffect(() => {
    setEmergencyActive(!!isEmergencyJunction);
  }, [isEmergencyJunction]);

  const addLog = (msg: string, type: "activate" | "deactivate" | "detect") => {
    setCorridorLog((prev) => [{ msg, time: new Date().toLocaleTimeString(), type }, ...prev].slice(0, 12));
  };

  const activateCorridor = useCallback((reason?: string) => {
    if (!selectedJunctionId) return;
    processCmd.mutate({
      data: { officerId: "OP-7742", junctionId: selectedJunctionId, rawText: "activate emergency corridor", language: "english" },
    });
    setEmergencyActive(true);
    addLog(reason ? `Auto-activated: ${reason} detected` : "Emergency corridor activated manually", "activate");
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(
        reason ? `${reason} detected. Emergency corridor activated. All signals set to red.` : "Emergency corridor activated."
      );
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }, [selectedJunctionId, processCmd]);

  const deactivateCorridor = useCallback(() => {
    if (!selectedJunctionId) return;
    processCmd.mutate({
      data: { officerId: "OP-7742", junctionId: selectedJunctionId, rawText: "deactivate emergency corridor", language: "english" },
    });
    setEmergencyActive(false);
    setDetectedVehicle(null);
    addLog("Emergency corridor deactivated — signals restored to green", "deactivate");
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Emergency corridor deactivated. Restoring normal signal operations.");
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }, [selectedJunctionId, processCmd]);

  const handleVehicleDetected = useCallback((vehicle: DetectedVehicle) => {
    if (vehicle && !emergencyActive) {
      setDetectedVehicle(vehicle);
      addLog(`Camera: ${vehicle === "firetruck" ? "Fire Engine" : "Ambulance"} detected`, "detect");
      activateCorridor(vehicle === "firetruck" ? "Fire Engine" : "Ambulance");
    } else if (!vehicle) {
      setDetectedVehicle(null);
    }
  }, [emergencyActive, activateCorridor]);

  const webGLAvailable = typeof window !== "undefined" && hasWebGL();

  const simFallback = (
    <div className="w-full h-full">
      <Intersection2DFallback signalStates={signalStates} emergencyActive={emergencyActive} />
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 h-full">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Radio className={cn("w-5 h-5", emergencyActive ? "text-destructive animate-pulse" : "text-primary")} />
            <h1 className="font-mono text-sm uppercase tracking-widest text-primary">
              Camera Surveillance & Simulation
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedJunctionId}
              onChange={(e) => setSelectedJunctionId(e.target.value)}
              className="bg-card border border-primary/30 text-foreground font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-primary"
            >
              {junctions.map((j) => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
            {!emergencyActive ? (
              <button
                onClick={() => activateCorridor()}
                disabled={!selectedJunctionId}
                className="flex items-center gap-2 px-4 py-2 bg-destructive/20 border border-destructive/50 text-destructive font-mono text-xs uppercase tracking-widest rounded hover:bg-destructive/30 transition-colors disabled:opacity-40"
              >
                <ShieldAlert className="w-4 h-4" /> Activate Corridor
              </button>
            ) : (
              <button
                onClick={deactivateCorridor}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/40 text-green-400 font-mono text-xs uppercase tracking-widest rounded hover:bg-green-500/20 transition-colors animate-pulse"
              >
                <ShieldOff className="w-4 h-4" /> Deactivate Corridor
              </button>
            )}
          </div>
        </div>

        {/* Signal state bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-card/50 border border-border/40 rounded text-[10px] font-mono uppercase tracking-widest flex-wrap">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3 h-3" />
            {selectedJunction?.name ?? "—"}
          </div>
          <div className="w-px h-4 bg-border/40 mx-1" />
          {(["north", "south", "east", "west"] as const).map((dir) => (
            <div key={dir} className="flex items-center gap-1.5">
              <div className={cn(
                "w-2.5 h-2.5 rounded-full",
                signalStates[dir] === "green" ? "bg-signal-green shadow-[0_0_6px_#00ff44]" :
                signalStates[dir] === "yellow" ? "bg-signal-yellow shadow-[0_0_6px_#ffcc00]" :
                "bg-signal-red shadow-[0_0_6px_#ff2020]"
              )} />
              <span className="text-muted-foreground">{dir}</span>
            </div>
          ))}
          {emergencyActive && (
            <>
              <div className="w-px h-4 bg-border/40 mx-1" />
              <span className="text-destructive animate-pulse flex items-center gap-1">
                <Zap className="w-3 h-3" /> Emergency Active
              </span>
            </>
          )}
        </div>

        {/* Main grid */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Camera Feed */}
          <div className="tech-border flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border/50 bg-black/20 flex items-center justify-between flex-shrink-0">
              <span className="font-mono text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_#ef4444]" />
                Camera Feed — AI Detection
              </span>
              {detectedVehicle && (
                <span className={cn(
                  "font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border",
                  detectedVehicle === "firetruck"
                    ? "bg-red-500/20 border-red-500/50 text-red-400"
                    : "bg-green-500/10 border-green-500/40 text-green-300"
                )}>
                  {detectedVehicle === "firetruck" ? "🔴 Fire Engine" : "🟢 Ambulance"}
                </span>
              )}
            </div>
            <div className="flex-1 p-3 min-h-0 overflow-hidden">
              <CameraDetection onVehicleDetected={handleVehicleDetected} />
            </div>
          </div>

          {/* 3D Simulation */}
          <div className="tech-border flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border/50 bg-black/20 flex items-center justify-between flex-shrink-0">
              <span className="font-mono text-xs uppercase tracking-widest text-primary">
                3D Junction Simulation
              </span>
              {emergencyActive && (
                <span className="font-mono text-[10px] text-destructive animate-pulse uppercase tracking-widest">
                  ⚠ Emergency Mode
                </span>
              )}
            </div>
            <div className="flex-1 min-h-0 relative bg-black/40">
              {webGLAvailable ? (
                <WebGLErrorBoundary fallback={simFallback}>
                  <Intersection3D
                    signalStates={signalStates}
                    emergencyActive={emergencyActive}
                    detectedVehicle={detectedVehicle}
                  />
                </WebGLErrorBoundary>
              ) : (
                simFallback
              )}
            </div>
          </div>
        </div>

        {/* Corridor event log */}
        <div className="tech-border p-3 flex-shrink-0">
          <div className="font-mono text-[9px] text-primary/60 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Radio className="w-3 h-3" /> Corridor Event Log
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {corridorLog.length === 0 ? (
              <span className="font-mono text-[9px] text-muted-foreground/40">No corridor events yet</span>
            ) : (
              corridorLog.map((e, i) => (
                <div key={i} className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded border font-mono text-[9px]",
                  e.type === "activate" ? "bg-destructive/10 border-destructive/30 text-destructive" :
                  e.type === "deactivate" ? "bg-green-500/10 border-green-500/30 text-green-400" :
                  "bg-primary/5 border-primary/20 text-primary"
                )}>
                  <span className="text-muted-foreground mr-2">{e.time}</span>
                  {e.msg}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
