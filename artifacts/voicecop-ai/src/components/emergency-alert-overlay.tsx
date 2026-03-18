import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ShieldAlert, Volume2, CheckCircle2, X, Radio, Bluetooth } from "lucide-react";
import type { EmergencyAlert } from "@/hooks/use-emergency-alert";

interface Props {
  alert: EmergencyAlert | null;
  isPlaying: boolean;
  onAcknowledge: (id: string) => void;
  onDismiss: () => void;
}

export function EmergencyAlertOverlay({ alert, isPlaying, onAcknowledge, onDismiss }: Props) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 400);
    return () => clearInterval(id);
  }, [isPlaying]);

  if (!alert) return null;

  const isAmbulance = alert.vehicleType === "ambulance";
  const isFiretruck = alert.vehicleType === "firetruck";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none">
      {/* Red flash border */}
      {!alert.acknowledged && (
        <div className="fixed inset-0 pointer-events-none animate-pulse">
          <div className="absolute inset-0 border-4 border-destructive/60 rounded" />
        </div>
      )}

      <div
        className={cn(
          "pointer-events-auto mt-4 mx-4 w-full max-w-xl rounded-lg border shadow-2xl overflow-hidden",
          alert.acknowledged
            ? "border-green-500/40 bg-card/95"
            : "border-destructive bg-card/95 shadow-[0_0_40px_rgba(255,32,32,0.3)]"
        )}
        style={{ backdropFilter: "blur(16px)" }}
      >
        {/* Header bar */}
        <div className={cn(
          "px-4 py-2.5 flex items-center gap-3",
          alert.acknowledged ? "bg-green-500/10" : "bg-destructive/20"
        )}>
          {/* Animated icon */}
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            alert.acknowledged ? "bg-green-500/20" : "bg-destructive/30 animate-pulse"
          )}>
            <ShieldAlert className={cn(
              "w-4 h-4",
              alert.acknowledged ? "text-green-400" : "text-destructive"
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className={cn(
              "font-mono text-xs uppercase tracking-widest font-bold",
              alert.acknowledged ? "text-green-400" : "text-destructive"
            )}>
              {alert.acknowledged ? "✓ Alert Acknowledged" : "⚠ Emergency Alert"}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground truncate">
              {alert.junctionName} · {alert.timestamp}
            </div>
          </div>

          {/* Bluetooth indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/20 rounded">
            <Bluetooth className="w-3 h-3 text-primary" />
            <span className="font-mono text-[9px] text-primary uppercase tracking-widest">BT Audio</span>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Vehicle type badge */}
        <div className="px-4 pt-3 flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono uppercase tracking-widest",
            isAmbulance
              ? "bg-green-500/10 border-green-500/30 text-green-300"
              : isFiretruck
              ? "bg-red-500/15 border-red-500/40 text-red-400"
              : "bg-primary/10 border-primary/30 text-primary"
          )}>
            <span className="text-base leading-none">
              {isAmbulance ? "🚑" : isFiretruck ? "🚒" : "🚨"}
            </span>
            {isAmbulance ? "Ambulance" : isFiretruck ? "Fire Engine" : "Emergency"} Detected
          </div>

          {isPlaying && (
            <div className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span className="font-mono text-[10px] text-primary uppercase tracking-widest">
                Broadcasting{dots}
              </span>
            </div>
          )}
        </div>

        {/* Alert message */}
        <div className="px-4 py-3">
          <div className="bg-black/40 border border-border/30 rounded p-3 relative overflow-hidden">
            {/* Scan line animation */}
            {!alert.acknowledged && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent animate-[scan_2s_linear_infinite]" />
            )}
            <div className="flex items-start gap-2">
              <Radio className={cn(
                "w-3 h-3 mt-0.5 flex-shrink-0",
                isPlaying ? "text-primary animate-pulse" : "text-muted-foreground"
              )} />
              <p className="font-mono text-xs text-foreground leading-relaxed">
                {alert.message}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {!alert.acknowledged ? (
          <div className="px-4 pb-4 flex gap-3">
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-background font-mono text-xs uppercase tracking-widest rounded hover:bg-primary/90 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Acknowledge Alert
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2.5 border border-border/50 text-muted-foreground font-mono text-xs uppercase tracking-widest rounded hover:border-destructive/40 hover:text-destructive transition-colors"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 py-2 text-green-400 font-mono text-[10px] uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Unit acknowledged · Monitoring junction
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
