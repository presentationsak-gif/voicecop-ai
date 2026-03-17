import { useState, useRef, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout";
import { useProcessCommand, useListCommands, useListJunctions } from "@workspace/api-client-react";
import { Mic, MicOff, Send, Volume2, History, Wifi, WifiOff, Loader2 } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type RecordingState = "idle" | "connecting" | "listening" | "error";

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Int16Array {
  if (inputRate === outputRate) {
    const result = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      result[i] = Math.max(-32768, Math.min(32767, buffer[i] * 32768));
    }
    return result;
  }
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Int16Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const idx = Math.floor(i * ratio);
    result[i] = Math.max(-32768, Math.min(32767, buffer[idx] * 32768));
  }
  return result;
}

export default function VoiceInterface() {
  const [inputText, setInputText] = useState("");
  const [selectedJunction, setSelectedJunction] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<"english" | "tamil" | "hindi">("english");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [statusMsg, setStatusMsg] = useState("Awaiting Input");
  const [aiSpeaking, setAiSpeaking] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const endOfLogRef = useRef<HTMLDivElement>(null);

  const { data: junctionsData } = useListJunctions();
  const { data: commandsData, isLoading: cmdsLoading } = useListCommands({ limit: 50 });
  const processCmd = useProcessCommand({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
        if (data.aiResponse) {
          setAiSpeaking(data.aiResponse);
          speak(data.aiResponse);
          setTimeout(() => setAiSpeaking(null), 6000);
        }
      },
    },
  });

  const junctions = junctionsData?.junctions ?? [];
  const commands = commandsData?.commands ?? [];

  useEffect(() => {
    endOfLogRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commands]);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 0.9;
    window.speechSynthesis.speak(u);
  };

  const stopRecording = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ terminate_session: true }));
      wsRef.current.close();
    }
    wsRef.current = null;
    setRecordingState("idle");
    setStatusMsg("Awaiting Input");
  }, []);

  const startRecording = useCallback(async () => {
    if (!selectedJunction) {
      setStatusMsg("Select a junction first");
      return;
    }
    setRecordingState("connecting");
    setStatusMsg("Connecting to AI...");
    setLiveTranscript("");

    try {
      const tokenRes = await fetch(`${BASE}/api/voice/token`, { method: "POST" });
      if (!tokenRes.ok) throw new Error(`Token error: ${tokenRes.status}`);
      const { token, wsUrl } = await tokenRes.json() as { token: string; wsUrl: string };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const sampleRate = 16000;
      const ws = new WebSocket(
        `${wsUrl}?sample_rate=${sampleRate}&token=${token}&encoding=pcm_s16le`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setRecordingState("listening");
        setStatusMsg("Listening...");
        source.connect(processor);
        processor.connect(audioCtx.destination);
      };

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const downsampled = downsampleBuffer(input, audioCtx.sampleRate, sampleRate);
        const binary = downsampled.buffer;
        ws.send(binary);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type?: string;
            transcript?: string;
            end_of_turn?: boolean;
            // v2 legacy fields (fallback)
            message_type?: string;
            text?: string;
          };
          // Universal Streaming v3 format
          if (msg.type === "Turn") {
            if (msg.end_of_turn) {
              setLiveTranscript("");
              if (msg.transcript) {
                setInputText((prev) => (prev ? prev + " " + msg.transcript : msg.transcript!));
              }
            } else {
              setLiveTranscript(msg.transcript ?? "");
            }
          }
          // v2 fallback
          else if (msg.message_type === "PartialTranscript" && msg.text) {
            setLiveTranscript(msg.text);
          } else if (msg.message_type === "FinalTranscript" && msg.text) {
            setLiveTranscript("");
            setInputText((prev) => (prev ? prev + " " + msg.text : msg.text!));
          }
        } catch (_) {}
      };

      ws.onerror = () => {
        setRecordingState("error");
        setStatusMsg("Connection error");
        stopRecording();
      };

      ws.onclose = () => {
        if (recordingState === "listening") stopRecording();
      };
    } catch (err) {
      console.error(err);
      setRecordingState("error");
      setStatusMsg(err instanceof Error ? err.message : "Microphone error");
      stopRecording();
    }
  }, [selectedJunction, stopRecording, recordingState]);

  const toggleRecording = () => {
    if (recordingState === "listening" || recordingState === "connecting") {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !selectedJunction) return;
    processCmd.mutate({
      data: { officerId: "OP-7742", junctionId: selectedJunction, rawText: text, language: selectedLanguage },
    });
    setInputText("");
    setLiveTranscript("");
    if (recordingState === "listening") stopRecording();
  };

  const micActive = recordingState === "listening" || recordingState === "connecting";

  return (
    <AppLayout>
      <div className="grid lg:grid-cols-2 gap-8 h-full">

        {/* Left: Input Panel */}
        <div className="flex flex-col gap-6 h-full">
          <div className="tech-border flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-card to-background relative overflow-hidden">
            <div className="absolute inset-0 scanline pointer-events-none" />

            <div className="flex items-center gap-2 mb-2">
              {recordingState === "listening" ? (
                <Wifi className="w-4 h-4 text-green-400 animate-pulse" />
              ) : recordingState === "connecting" ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : recordingState === "error" ? (
                <WifiOff className="w-4 h-4 text-destructive" />
              ) : (
                <WifiOff className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                AssemblyAI Real-Time STT
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold uppercase tracking-widest mb-10 glow-text">
              Voice Command Array
            </h2>

            {/* Mic Button */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`relative group w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 mb-8 ${
                micActive
                  ? "bg-destructive/20 border-2 border-destructive shadow-[0_0_50px_rgba(255,0,0,0.4)]"
                  : "bg-primary/5 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_30px_rgba(0,240,255,0.3)]"
              }`}
            >
              {recordingState === "listening" && (
                <>
                  <div className="absolute inset-0 rounded-full border border-destructive animate-ping opacity-75" />
                  <div className="absolute -inset-4 rounded-full border border-destructive/50 animate-ping opacity-40" style={{ animationDelay: "0.3s" }} />
                </>
              )}
              {recordingState === "connecting" ? (
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
              ) : micActive ? (
                <MicOff className="w-16 h-16 text-destructive" />
              ) : (
                <Mic className="w-16 h-16 text-primary group-hover:scale-110 transition-transform duration-300" />
              )}
            </button>

            {/* Live transcript bubble */}
            <div className="w-full max-w-md min-h-[56px] bg-black/40 border border-border/50 p-4 rounded text-center mb-4">
              {liveTranscript ? (
                <p className="font-mono text-sm text-primary animate-pulse leading-relaxed">
                  "{liveTranscript}"
                </p>
              ) : (
                <span className={`font-mono text-lg font-bold uppercase ${micActive ? "text-destructive animate-pulse" : "text-primary"}`}>
                  {statusMsg}
                </span>
              )}
            </div>

            {/* AI earpiece response */}
            {aiSpeaking && (
              <div className="w-full max-w-md bg-primary/10 border border-primary/30 rounded p-3 flex items-start gap-2">
                <Volume2 className="w-4 h-4 text-primary mt-0.5 animate-pulse flex-shrink-0" />
                <p className="font-mono text-xs text-primary leading-relaxed">{aiSpeaking}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="tech-border p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-primary">Target Sector</label>
                  <select
                    value={selectedJunction}
                    onChange={(e) => setSelectedJunction(e.target.value)}
                    className="bg-black/50 border border-border/50 text-foreground text-sm font-mono p-3 rounded focus:outline-none focus:border-primary transition-colors"
                    required
                  >
                    <option value="" disabled>Select junction...</option>
                    {junctions.map((j) => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-primary">Language</label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as typeof selectedLanguage)}
                    className="bg-black/50 border border-border/50 text-foreground text-sm font-mono p-3 rounded focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="english">English</option>
                    <option value="tamil">Tamil</option>
                    <option value="hindi">Hindi</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] uppercase tracking-widest text-primary">Command Input</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={micActive ? "Speak into microphone..." : "Type or use mic..."}
                    className="flex-1 bg-black/50 border border-border/50 text-foreground text-sm font-mono p-3 rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                  <button
                    type="submit"
                    disabled={processCmd.isPending || !inputText.trim() || !selectedJunction}
                    className="bg-primary/20 text-primary border border-primary/50 px-5 rounded hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-mono uppercase text-sm tracking-wider"
                  >
                    {processCmd.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> TX</>}
                  </button>
                </div>
              </div>

              <p className="font-mono text-[10px] text-muted-foreground">
                Try: "North signal stop" · "Activate emergency corridor" · "East lane go"
              </p>
            </form>
          </div>
        </div>

        {/* Right: Command Log */}
        <div className="tech-border flex flex-col h-full bg-card/50">
          <div className="p-4 border-b border-border/50 flex items-center gap-2 bg-black/20">
            <History className="w-4 h-4 text-primary" />
            <h2 className="font-mono text-sm uppercase tracking-widest text-primary">Communication Log</h2>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">{commands.length} entries</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {cmdsLoading ? (
              <div className="text-center font-mono text-muted-foreground text-xs mt-10 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Decrypting logs...
              </div>
            ) : commands.length === 0 ? (
              <div className="text-center font-mono text-muted-foreground text-xs mt-10">
                No commands yet. Use the mic or type a command.
              </div>
            ) : (
              [...commands].reverse().map((cmd) => (
                <div key={cmd.id} className="flex flex-col gap-2 border-b border-border/20 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-6 h-6 rounded bg-secondary flex items-center justify-center border border-border flex-shrink-0">
                      <span className="font-mono text-[9px] text-muted-foreground">OP</span>
                    </div>
                    <div className="flex-1 bg-black/30 border border-border/40 rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{cmd.officerName}</span>
                        <span className="font-mono text-[9px] text-muted-foreground">{formatTime(cmd.createdAt)}</span>
                      </div>
                      <p className="font-sans text-sm text-foreground">"{cmd.rawText}"</p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-mono uppercase rounded">
                          {cmd.intent}
                        </span>
                        <span className={`px-2 py-0.5 border text-[9px] font-mono uppercase rounded ${
                          cmd.status === "executed" ? "bg-green-500/10 border-green-500/30 text-green-400" :
                          cmd.status === "rejected" ? "bg-destructive/10 border-destructive/30 text-destructive" :
                          "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        }`}>
                          {cmd.status}
                        </span>
                        <span className="px-2 py-0.5 bg-muted/20 border border-border/30 text-muted-foreground text-[9px] font-mono rounded">
                          {Math.round(cmd.confidence * 100)}% conf
                        </span>
                      </div>
                    </div>
                  </div>

                  {cmd.aiResponse && (
                    <div className="flex items-start gap-3 ml-8">
                      <div className="mt-1 w-6 h-6 rounded bg-primary/20 flex items-center justify-center border border-primary/50 shadow-[0_0_10px_rgba(0,240,255,0.2)] flex-shrink-0">
                        <Volume2 className="w-3 h-3 text-primary" />
                      </div>
                      <div className="flex-1 bg-primary/5 border border-primary/20 rounded p-3 relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                        <p className="font-mono text-xs text-primary leading-relaxed">{cmd.aiResponse}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={endOfLogRef} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
