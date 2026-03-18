import { useRef, useEffect, useState, useCallback } from "react";
import { Camera, CameraOff, AlertTriangle, Truck, Ambulance, ScanLine, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type DetectedVehicle = "ambulance" | "firetruck" | null;

interface DetectionResult {
  type: DetectedVehicle;
  confidence: number;
  timestamp: string;
  bbox?: { x: number; y: number; w: number; h: number };
}

interface CameraDetectionProps {
  onVehicleDetected?: (vehicle: DetectedVehicle) => void;
  active?: boolean;
}

function analyzeFrame(canvas: HTMLCanvasElement, video: HTMLVideoElement): DetectionResult | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  canvas.width = video.videoWidth || 320;
  canvas.height = video.videoHeight || 240;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const total = data.length / 4;

  let redPixels = 0;
  let whitePixels = 0;
  let redWhiteCombo = 0;

  // Sample every 8th pixel for performance
  for (let i = 0; i < data.length; i += 32) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const isRed = r > 160 && g < 80 && b < 80;
    const isWhite = r > 210 && g > 210 && b > 210;
    const isBrightRed = r > 180 && g < 100 && b < 100;

    if (isRed) redPixels++;
    if (isWhite) whitePixels++;
    if (isBrightRed) redWhiteCombo++;
  }

  const sampledTotal = total / 8;
  const redRatio = redPixels / sampledTotal;
  const whiteRatio = whitePixels / sampledTotal;

  const centerX = Math.floor(canvas.width * 0.2);
  const centerY = Math.floor(canvas.height * 0.2);
  const bboxW = Math.floor(canvas.width * 0.6);
  const bboxH = Math.floor(canvas.height * 0.6);

  // Fire truck: dominant red (>25%)
  if (redRatio > 0.25) {
    return {
      type: "firetruck",
      confidence: Math.min(0.95, redRatio * 2.5),
      timestamp: new Date().toLocaleTimeString(),
      bbox: { x: centerX, y: centerY, w: bboxW, h: bboxH },
    };
  }

  // Ambulance: dominant white (>40%) with some red accents
  if (whiteRatio > 0.4 && redWhiteCombo > sampledTotal * 0.03) {
    return {
      type: "ambulance",
      confidence: Math.min(0.93, whiteRatio * 1.8),
      timestamp: new Date().toLocaleTimeString(),
      bbox: { x: centerX, y: centerY, w: bboxW, h: bboxH },
    };
  }

  return null;
}

export function CameraDetection({ onVehicleDetected, active = true }: CameraDetectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const lastDetectionRef = useRef<number>(0);

  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "active" | "denied">("idle");
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [currentDetection, setCurrentDetection] = useState<DetectedVehicle>(null);
  const [scanLine, setScanLine] = useState(0);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setCameraState("idle");
    setCurrentDetection(null);
  }, []);

  const drawOverlay = useCallback((result: DetectionResult | null, scanPos: number) => {
    const oc = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!oc || !video) return;
    const ctx = oc.getContext("2d");
    if (!ctx) return;
    oc.width = video.clientWidth || 320;
    oc.height = video.clientHeight || 240;
    ctx.clearRect(0, 0, oc.width, oc.height);

    // Scan line
    ctx.strokeStyle = "rgba(0, 229, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, scanPos);
    ctx.lineTo(oc.width, scanPos);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Grid overlay
    ctx.strokeStyle = "rgba(0, 229, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < oc.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, oc.height);
      ctx.stroke();
    }
    for (let y = 0; y < oc.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(oc.width, y);
      ctx.stroke();
    }

    // Detection bounding box
    if (result?.bbox) {
      const { x, y, w, h } = result.bbox;
      const scaleX = oc.width / (videoRef.current?.videoWidth || 320);
      const scaleY = oc.height / (videoRef.current?.videoHeight || 240);
      const rx = x * scaleX;
      const ry = y * scaleY;
      const rw = w * scaleX;
      const rh = h * scaleY;

      const color = result.type === "firetruck" ? "#ff2020" : "#00ff88";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.strokeRect(rx, ry, rw, rh);

      // Corner marks
      const cs = 18;
      ctx.lineWidth = 4;
      [[rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh]].forEach(([cx, cy], i) => {
        ctx.beginPath();
        ctx.moveTo(cx + (i % 2 === 0 ? cs : -cs), cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + (i < 2 ? cs : -cs));
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = color;
      ctx.font = "bold 11px monospace";
      ctx.fillText(
        `${result.type === "firetruck" ? "FIRE ENGINE" : "AMBULANCE"} ${Math.round(result.confidence * 100)}%`,
        rx + 4,
        ry - 6
      );
    }
  }, []);

  const runDetection = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended) return;

    setScanLine((prev) => (prev + 4) % (video.clientHeight || 240));

    const now = Date.now();
    if (now - lastDetectionRef.current > 400) {
      lastDetectionRef.current = now;
      const result = analyzeFrame(canvas, video);

      if (result) {
        setCurrentDetection(result.type);
        setDetections((prev) => [result, ...prev].slice(0, 8));
        onVehicleDetected?.(result.type);
      } else {
        setCurrentDetection(null);
      }

      drawOverlay(result, (scanLine + 4) % (video.clientHeight || 240));
    }

    animRef.current = requestAnimationFrame(runDetection);
  }, [onVehicleDetected, drawOverlay, scanLine]);

  const startCamera = useCallback(async () => {
    setCameraState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("active");
      animRef.current = requestAnimationFrame(runDetection);
    } catch (err: any) {
      setCameraState(err?.name === "NotAllowedError" ? "denied" : "idle");
    }
  }, [runDetection]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Update animation loop when runDetection changes
  useEffect(() => {
    if (cameraState === "active") {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(runDetection);
    }
  }, [cameraState, runDetection]);

  const simulateDetection = (type: "ambulance" | "firetruck") => {
    const r: DetectionResult = {
      type,
      confidence: 0.91 + Math.random() * 0.06,
      timestamp: new Date().toLocaleTimeString(),
      bbox: { x: 60, y: 50, w: 200, h: 130 },
    };
    setCurrentDetection(type);
    setDetections((prev) => [r, ...prev].slice(0, 8));
    onVehicleDetected?.(type);
    setTimeout(() => {
      setCurrentDetection(null);
      onVehicleDetected?.(null);
    }, 6000);
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Camera feed */}
      <div className="relative flex-1 bg-black/60 rounded border border-primary/20 overflow-hidden min-h-0">
        {cameraState !== "active" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            {cameraState === "idle" && (
              <>
                <div className="w-16 h-16 rounded-full border-2 border-primary/30 flex items-center justify-center">
                  <Camera className="w-7 h-7 text-primary/60" />
                </div>
                <p className="font-mono text-xs text-muted-foreground text-center px-4">
                  Connect camera to detect emergency vehicles
                </p>
                <button
                  onClick={startCamera}
                  className="px-5 py-2.5 bg-primary text-background font-mono text-xs uppercase tracking-widest rounded hover:bg-primary/90 transition-colors"
                >
                  Connect Camera
                </button>
              </>
            )}
            {cameraState === "requesting" && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="font-mono text-xs text-primary animate-pulse">Requesting access...</p>
              </div>
            )}
            {cameraState === "denied" && (
              <>
                <CameraOff className="w-10 h-10 text-destructive" />
                <p className="font-mono text-xs text-destructive text-center px-4">
                  Camera access denied. Enable in browser settings.
                </p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 border border-destructive/40 text-destructive font-mono text-xs rounded hover:bg-destructive/10"
                >
                  Retry
                </button>
              </>
            )}
          </div>
        )}

        {/* Video element */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={cn("w-full h-full object-cover", cameraState !== "active" && "opacity-0")}
        />

        {/* Detection overlay canvas */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ mixBlendMode: "screen" }}
        />

        {/* Hidden analysis canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Active indicator */}
        {cameraState === "active" && (
          <div className="absolute top-2 left-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]" />
            <span className="font-mono text-[9px] text-white/80 uppercase tracking-widest">LIVE</span>
          </div>
        )}

        {/* Detection badge */}
        {currentDetection && (
          <div className={cn(
            "absolute top-2 right-2 flex items-center gap-2 px-3 py-1.5 rounded border font-mono text-[10px] uppercase tracking-widest animate-pulse",
            currentDetection === "firetruck"
              ? "bg-red-500/30 border-red-500 text-red-400"
              : "bg-green-500/20 border-green-400 text-green-300"
          )}>
            {currentDetection === "firetruck" ? <Truck className="w-3 h-3" /> : <Ambulance className="w-3 h-3" />}
            {currentDetection === "firetruck" ? "Fire Engine" : "Ambulance"} Detected
          </div>
        )}

        {/* Camera stop button */}
        {cameraState === "active" && (
          <button
            onClick={stopCamera}
            className="absolute bottom-2 right-2 p-1.5 bg-black/60 border border-border/50 rounded text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
          >
            <CameraOff className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Demo simulation buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => simulateDetection("ambulance")}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-[10px] uppercase tracking-wider rounded hover:bg-green-500/20 transition-colors"
        >
          <Ambulance className="w-3.5 h-3.5" />
          Simulate Ambulance
        </button>
        <button
          onClick={() => simulateDetection("firetruck")}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] uppercase tracking-wider rounded hover:bg-red-500/20 transition-colors"
        >
          <Truck className="w-3.5 h-3.5" />
          Simulate Fire Engine
        </button>
      </div>

      {/* Detection log */}
      <div className="bg-black/40 border border-border/30 rounded p-2 max-h-32 overflow-y-auto">
        <div className="font-mono text-[9px] text-primary/60 uppercase tracking-widest mb-1.5 flex items-center gap-1">
          <ScanLine className="w-3 h-3" /> Detection Log
        </div>
        {detections.length === 0 ? (
          <div className="font-mono text-[9px] text-muted-foreground/50 text-center py-2">No detections yet</div>
        ) : (
          detections.map((d, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                d.type === "firetruck" ? "bg-red-500" : "bg-green-400"
              )} />
              <span className="font-mono text-[9px] text-muted-foreground flex-1">
                {d.type === "firetruck" ? "FIRE ENGINE" : "AMBULANCE"}
              </span>
              <span className="font-mono text-[9px] text-primary/60">{Math.round(d.confidence * 100)}%</span>
              <span className="font-mono text-[9px] text-muted-foreground/50">{d.timestamp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
