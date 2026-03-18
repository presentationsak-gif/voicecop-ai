import { useRef, useCallback, useState } from "react";

export interface EmergencyAlert {
  id: string;
  junctionName: string;
  vehicleType: "ambulance" | "firetruck" | "general";
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

function playPoliceSiren(ctx: AudioContext, duration = 2.5): Promise<void> {
  return new Promise((resolve) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const lfoOsc = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    // LFO for pitch sweep (siren sweep 800hz <-> 1400hz)
    lfoOsc.type = "sine";
    lfoOsc.frequency.setValueAtTime(1.8, ctx.currentTime);
    lfoGain.gain.setValueAtTime(300, ctx.currentTime);
    lfoOsc.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);

    // Main oscillator
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(1000, ctx.currentTime);

    // Gain envelope
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.35, ctx.currentTime + duration - 0.2);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    lfoOsc.start(ctx.currentTime);
    oscillator.start(ctx.currentTime);
    lfoOsc.stop(ctx.currentTime + duration);
    oscillator.stop(ctx.currentTime + duration);

    oscillator.onended = () => resolve();
  });
}

function playAlertBeep(ctx: AudioContext): Promise<void> {
  return new Promise((resolve) => {
    const frequencies = [880, 1100, 880, 1100];
    let time = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.4, time + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, time + 0.12);
      osc.connect(gainNode);
      osc.start(time);
      osc.stop(time + 0.15);
      if (i === frequencies.length - 1) {
        osc.onended = () => resolve();
      }
      time += 0.18;
    });
  });
}

function speakAlert(text: string, priority: "urgent" | "normal" = "urgent"): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) { resolve(); return; }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = priority === "urgent" ? 0.88 : 0.92;
    utterance.pitch = priority === "urgent" ? 1.05 : 0.88;
    utterance.volume = 1.0;

    // Try to pick a clear English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Google") || v.name.includes("Microsoft") || v.name.includes("Natural"))
    ) ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function useEmergencyAlert() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<EmergencyAlert | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const triggerAlert = useCallback(
    async (opts: {
      junctionName: string;
      vehicleType?: "ambulance" | "firetruck" | "general";
      customMessage?: string;
      sirenMode?: "beep" | "siren";
    }) => {
      if (isPlaying) return;
      setIsPlaying(true);

      const vehicleLabel =
        opts.vehicleType === "ambulance"
          ? "Ambulance"
          : opts.vehicleType === "firetruck"
          ? "Fire Engine"
          : "Emergency Vehicle";

      const message =
        opts.customMessage ??
        `Attention Officer. ${vehicleLabel} detected at ${opts.junctionName}. Emergency corridor is now active. All signals set to red. Please acknowledge and clear the path. Stay alert.`;

      const alert: EmergencyAlert = {
        id: crypto.randomUUID(),
        junctionName: opts.junctionName,
        vehicleType: opts.vehicleType ?? "general",
        message,
        timestamp: new Date().toLocaleTimeString(),
        acknowledged: false,
      };

      setActiveAlert(alert);
      setAlerts((prev) => [alert, ...prev].slice(0, 20));

      try {
        const ctx = getAudioCtx();

        // Step 1: play siren/beep first
        if (opts.sirenMode === "beep") {
          await playAlertBeep(ctx);
        } else {
          await playPoliceSiren(ctx, 2.5);
        }

        // Brief pause
        await new Promise((r) => setTimeout(r, 300));

        // Step 2: speak the voice alert (routed to Bluetooth if connected)
        await speakAlert(message, "urgent");
      } catch (err) {
        console.error("Emergency alert audio error:", err);
      } finally {
        setIsPlaying(false);
      }
    },
    [isPlaying, getAudioCtx]
  );

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
    setActiveAlert((prev) =>
      prev && prev.id === alertId ? { ...prev, acknowledged: true } : prev
    );
    // Speak acknowledgement
    speakAlert("Alert acknowledged. Standing by.", "normal");
  }, []);

  const dismissActiveAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const testAlert = useCallback(() => {
    triggerAlert({
      junctionName: "Test Junction",
      vehicleType: "ambulance",
      sirenMode: "beep",
      customMessage: "This is a test alert. Emergency system check complete. Bluetooth audio confirmed.",
    });
  }, [triggerAlert]);

  return {
    alerts,
    activeAlert,
    isPlaying,
    triggerAlert,
    acknowledgeAlert,
    dismissActiveAlert,
    testAlert,
  };
}
