import { TrafficSignalState } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface SignalNodeProps {
  state: TrafficSignalState | string;
  direction: string;
  onClick?: () => void;
  isLoading?: boolean;
}

export function SignalNode({ state, direction, onClick, isLoading }: SignalNodeProps) {
  const isRed = state === 'red';
  const isYellow = state === 'yellow';
  const isGreen = state === 'green';

  return (
    <button 
      onClick={onClick}
      disabled={isLoading || !onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded bg-black/60 border transition-all duration-200",
        onClick ? "hover:border-primary/50 cursor-pointer" : "cursor-default",
        isLoading ? "opacity-50" : "opacity-100",
        "border-border/40"
      )}
    >
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
        {direction.substring(0, 1)}
      </span>
      <div className="flex flex-col gap-1.5 p-1.5 rounded-full bg-black/80 border border-border/30">
        <div className={cn(
          "w-3 h-3 rounded-full transition-all duration-300",
          isRed ? "bg-signal-red shadow-[0_0_10px_rgba(255,0,0,0.8)]" : "bg-signal-red/20"
        )} />
        <div className={cn(
          "w-3 h-3 rounded-full transition-all duration-300",
          isYellow ? "bg-signal-yellow shadow-[0_0_10px_rgba(255,200,0,0.8)]" : "bg-signal-yellow/20"
        )} />
        <div className={cn(
          "w-3 h-3 rounded-full transition-all duration-300",
          isGreen ? "bg-signal-green shadow-[0_0_10px_rgba(0,255,0,0.8)]" : "bg-signal-green/20"
        )} />
      </div>
    </button>
  );
}
