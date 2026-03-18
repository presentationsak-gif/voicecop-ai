import { useRef, useEffect } from "react";

interface SignalStates {
  north: "red" | "yellow" | "green";
  south: "red" | "yellow" | "green";
  east: "red" | "yellow" | "green";
  west: "red" | "yellow" | "green";
}

interface Props {
  signalStates?: SignalStates;
  emergencyActive?: boolean;
}

const SIG_COLOR = { red: "#ff2020", yellow: "#ffcc00", green: "#00ff44" };

interface Vehicle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  type: "car" | "ambulance" | "firetruck";
  len: number;
  wid: number;
  blink: number;
}

export function Intersection2DFallback({ signalStates, emergencyActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const vehiclesRef = useRef<Vehicle[]>([]);

  const sig = signalStates ?? { north: "red", south: "green", east: "red", west: "red" };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const roadW = 60;

    // Init vehicles
    if (vehiclesRef.current.length === 0) {
      vehiclesRef.current = [
        { x: cx - 200, y: cy - 15, vx: 1.2, vy: 0, color: "#1e40af", type: "car", len: 24, wid: 14, blink: 0 },
        { x: cx + 180, y: cy + 15, vx: -1.0, vy: 0, color: "#065f46", type: "car", len: 24, wid: 14, blink: 0 },
        { x: cx + 15, y: cy - 200, vx: 0, vy: 1.1, color: "#374151", type: "car", len: 14, wid: 24, blink: 0 },
        { x: cx - 15, y: cy + 180, vx: 0, vy: -1.3, color: "#7c3aed", type: "car", len: 14, wid: 24, blink: 0 },
        { x: cx + 100, y: cy - 15, vx: 1.4, vy: 0, color: "#0f766e", type: "car", len: 24, wid: 14, blink: 0 },
        // Ambulance
        { x: cx - 250, y: cy - 15, vx: 2.2, vy: 0, color: "#f8fafc", type: "ambulance", len: 30, wid: 16, blink: 0 },
        // Fire truck
        { x: cx + 15, y: cy - 280, vx: 0, vy: 2.0, color: "#dc2626", type: "firetruck", len: 16, wid: 32, blink: 0 },
      ];
    }

    let t = 0;

    function draw() {
      if (!ctx || !canvas) return;
      t++;
      const w = canvas.width;
      const h = canvas.height;

      // Background
      ctx.fillStyle = "#060d1a";
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "rgba(0,229,255,0.05)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      // Roads
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, cy - roadW / 2, w, roadW); // E-W
      ctx.fillRect(cx - roadW / 2, 0, roadW, h); // N-S

      // Intersection box
      ctx.fillStyle = "#0d1425";
      ctx.fillRect(cx - roadW / 2, cy - roadW / 2, roadW, roadW);

      // Road dashes E-W
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.setLineDash([20, 15]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, cy); ctx.lineTo(w, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Road dashes N-S
      ctx.setLineDash([20, 15]);
      ctx.beginPath();
      ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Emergency flash overlay
      if (emergencyActive && t % 30 < 15) {
        ctx.fillStyle = "rgba(255, 32, 32, 0.07)";
        ctx.fillRect(0, 0, w, h);
      }

      // Traffic lights
      const lights: Array<{ lx: number; ly: number; dir: keyof typeof sig }> = [
        { lx: cx + roadW / 2 + 10, ly: cy - roadW / 2 - 10, dir: "north" },
        { lx: cx - roadW / 2 - 30, ly: cy + roadW / 2 + 10, dir: "south" },
        { lx: cx + roadW / 2 + 10, ly: cy + roadW / 2 + 10, dir: "east" },
        { lx: cx - roadW / 2 - 30, ly: cy - roadW / 2 - 10, dir: "west" },
      ];

      lights.forEach(({ lx, ly, dir }) => {
        const state = sig[dir];
        // Pole
        ctx.fillStyle = "#334155";
        ctx.fillRect(lx + 8, ly, 4, 28);
        // Housing
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(lx, ly, 20, 28);
        // Lights
        ["red", "yellow", "green"].forEach((color, i) => {
          const lit = state === color;
          ctx.beginPath();
          ctx.arc(lx + 10, ly + 5 + i * 9, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = lit ? SIG_COLOR[color as keyof typeof SIG_COLOR] : "rgba(255,255,255,0.1)";
          if (lit) {
            ctx.shadowColor = SIG_COLOR[color as keyof typeof SIG_COLOR];
            ctx.shadowBlur = 10;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        });
        // Direction label
        ctx.fillStyle = "rgba(0,229,255,0.5)";
        ctx.font = "9px monospace";
        ctx.fillText(dir[0].toUpperCase(), lx + 6, ly + 38);
      });

      // Vehicles
      vehiclesRef.current.forEach((v) => {
        const isEmergency = v.type === "ambulance" || v.type === "firetruck";

        // Move
        if (!isEmergency || emergencyActive) {
          v.x += v.vx;
          v.y += v.vy;
          // Wrap around
          if (v.x > w + 50) v.x = -50;
          if (v.x < -50) v.x = w + 50;
          if (v.y > h + 50) v.y = -50;
          if (v.y < -50) v.y = h + 50;
        }

        if (isEmergency && !emergencyActive) return; // hide if not active

        // Draw vehicle body
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.roundRect(v.x - v.len / 2, v.y - v.wid / 2, v.len, v.wid, 3);
        ctx.fill();

        // Emergency lights blink
        if (isEmergency) {
          v.blink = (v.blink + 0.15) % (Math.PI * 2);
          const lightColor = Math.sin(v.blink) > 0
            ? (v.type === "ambulance" ? "#ff0000" : "#ffcc00")
            : "#0044ff";
          ctx.fillStyle = lightColor;
          ctx.shadowColor = lightColor;
          ctx.shadowBlur = 12;
          ctx.fillRect(v.x - v.len / 2 + 3, v.y - v.wid / 2 + 1, v.len - 6, 4);
          ctx.shadowBlur = 0;

          // Label
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.fillText(v.type === "ambulance" ? "AMB" : "FIRE", v.x, v.y + 2);
          ctx.textAlign = "left";
        }

        // Headlights
        ctx.fillStyle = "rgba(255,255,230,0.8)";
        const headX = v.vx > 0 || (v.vx === 0 && v.vy < 0) ? v.x + v.len / 2 - 2 : v.x - v.len / 2 + 2;
        ctx.fillRect(headX, v.y - v.wid / 4, 3, 3);
        ctx.fillRect(headX, v.y + v.wid / 4 - 3, 3, 3);
      });

      // Compass
      ["N", "S", "E", "W"].forEach((d, i) => {
        const positions = [[cx, 16], [cx, h - 8], [w - 12, cy], [12, cy]];
        ctx.fillStyle = "rgba(0,229,255,0.4)";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(d, positions[i][0], positions[i][1]);
      });
      ctx.textAlign = "left";

      // Label
      ctx.fillStyle = "rgba(0,229,255,0.4)";
      ctx.font = "9px monospace";
      ctx.fillText("JUNCTION SIMULATION", 8, 16);

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [sig, emergencyActive]);

  return (
    <canvas
      ref={canvasRef}
      width={520}
      height={400}
      className="w-full h-full"
      style={{ imageRendering: "crisp-edges" }}
    />
  );
}
