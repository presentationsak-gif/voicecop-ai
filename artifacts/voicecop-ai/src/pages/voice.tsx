import { useState, useRef, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout";
import { useProcessCommand, useListCommands, useListJunctions } from "@workspace/api-client-react";
import { Mic, MicOff, Send, Volume2, History, Loader2, AlertCircle, CheckCircle2, Bluetooth } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useEmergencyAlert } from "@/hooks/use-emergency-alert";
import { EmergencyAlertOverlay } from "@/components/emergency-alert-overlay";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Extend window for SpeechRecognition API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition | undefined;
    webkitSpeechRecognition: typeof SpeechRecognition | undefined;
  }
}

type RecordingState = "idle" | "listening" | "error";

export default function VoiceInterface() {
  const [inputText, setInputText] = useState("");
  const [selectedJunction, setSelectedJunction] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<"english" | "tamil" | "hindi">("english");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [statusMsg, setStatusMsg] = useState("Awaiting Input");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiSpeaking, setAiSpeaking] = useState<string | null>(null);
  const [hasSpeechAPI, setHasSpeechAPI] = useState(false);

  const queryClient = useQueryClient();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const submitCommandRef = useRef<(text: string) => void>(() => {});
  const endOfLogRef = useRef<HTMLDivElement>(null);

  const { alerts: emergencyAlerts, activeAlert, isPlaying: alertPlaying, triggerAlert, acknowledgeAlert, dismissActiveAlert, testAlert } = useEmergencyAlert();

  const { data: junctionsData } = useListJunctions();
  const { data: commandsData, isLoading: cmdsLoading } = useListCommands({ limit: 50 });
  const processCmd = useProcessCommand({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
        // Fire emergency alert before speaking AI response
        if (data.intent === "emergency_corridor" && (data.targetState as any) !== "deactivate") {
          const junctionName = junctionsData?.junctions?.find((j) => j.id === selectedJunction)?.name ?? "Junction";
          triggerAlert({
            junctionName,
            vehicleType: "general",
            sirenMode: "siren",
          });
        } else if (data.aiResponse) {
          setAiSpeaking(data.aiResponse);
          speakText(data.aiResponse);
          setTimeout(() => setAiSpeaking(null), 7000);
        }
      },
    },
  });

  const junctions = junctionsData?.junctions ?? [];
  const commands = commandsData?.commands ?? [];

  // Check Speech API availability on mount
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setHasSpeechAPI(!!SpeechRecognitionAPI);
  }, []);

  useEffect(() => {
    endOfLogRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commands]);

  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 0.85;
    window.speechSynthesis.speak(u);
  };

  const submitCommand = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !selectedJunction) return;
      setStatusMsg("Executing...");
      processCmd.mutate({
        data: {
          officerId: "OP-7742",
          junctionId: selectedJunction,
          rawText: trimmed,
          language: selectedLanguage,
        },
      });
      setInputText("");
      setLiveTranscript("");
      // Return to listening status after brief feedback
      setTimeout(() => setStatusMsg("Listening..."), 1500);
    },
    [selectedJunction, selectedLanguage, processCmd]
  );

  // Keep ref always pointing to latest submitCommand to avoid stale closures in speech handlers
  useEffect(() => {
    submitCommandRef.current = submitCommand;
  }, [submitCommand]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecordingState("idle");
    setStatusMsg("Awaiting Input");
    setLiveTranscript("");
  }, []);

  const startRecording = useCallback(() => {
    setErrorMsg(null);

    if (!selectedJunction) {
      setErrorMsg("Please select a target junction first.");
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setErrorMsg("Speech recognition is not supported in this browser. Please use Chrome or Edge, or type your command below.");
      return;
    }

    const langMap: Record<string, string> = {
      english: "en-US",
      tamil: "ta-IN",
      hindi: "hi-IN",
    };

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = langMap[selectedLanguage] ?? "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setRecordingState("listening");
      setStatusMsg("Listening...");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) setLiveTranscript(interim);
      if (finalText.trim()) {
        setLiveTranscript(finalText.trim());
        // Auto-submit immediately when speech is finalised
        submitCommandRef.current(finalText.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setErrorMsg("Microphone access denied. Please allow microphone permissions and try again.");
      } else if (event.error === "network") {
        setErrorMsg("Network error. Check your connection and try again.");
      } else if (event.error === "no-speech") {
        setStatusMsg("No speech detected. Try again.");
        setRecordingState("idle");
        return;
      } else {
        setErrorMsg(`Recognition error: ${event.error}`);
      }
      setRecordingState("error");
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      // If still in listening state (wasn't manually stopped), restart for continuous recording
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch (_) {
          setRecordingState("idle");
          setStatusMsg("Awaiting Input");
        }
      }
    };

    try {
      recognition.start();
    } catch (err) {
      setErrorMsg("Could not start speech recognition. Try again.");
      setRecordingState("error");
    }
  }, [selectedJunction, selectedLanguage]);

  const toggleRecording = () => {
    if (recordingState === "listening") {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recordingState === "listening") stopRecording();
    submitCommand(inputText);
  };

  const micActive = recordingState === "listening";

  // Quick-fire sample commands
  const sampleCommands = [
    "North signal stop",
    "East lane go",
    "Activate emergency corridor",
    "Deactivate emergency corridor",
    "South signal green",
    "All signals stop",
  ];

  return (
    <AppLayout>
      <div className="grid lg:grid-cols-2 gap-8 h-full">

        {/* Left: Input Panel */}
        <div className="flex flex-col gap-4 h-full">
          <div className="tech-border flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-card to-background relative overflow-hidden">
            <div className="absolute inset-0 scanline pointer-events-none" />

            {/* API Status Badge */}
            <div className="flex items-center gap-2 mb-3">
              {hasSpeechAPI ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {hasSpeechAPI ? "Web Speech API · AssemblyAI NLP" : "Speech API unavailable — use Chrome/Edge"}
              </span>
            </div>

            <h2 className="font-display text-2xl font-bold uppercase tracking-widest mb-8 glow-text">
              Voice Command Array
            </h2>

            {/* Mic Button */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`relative group w-44 h-44 rounded-full flex items-center justify-center transition-all duration-500 mb-6 ${
                micActive
                  ? "bg-destructive/20 border-2 border-destructive shadow-[0_0_50px_rgba(255,0,0,0.4)]"
                  : "bg-primary/5 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_30px_rgba(0,240,255,0.3)]"
              }`}
            >
              {micActive && (
                <>
                  <div className="absolute inset-0 rounded-full border border-destructive animate-ping opacity-75" />
                  <div className="absolute -inset-4 rounded-full border border-destructive/40 animate-ping opacity-40" style={{ animationDelay: "0.4s" }} />
                </>
              )}
              {micActive ? (
                <MicOff className="w-14 h-14 text-destructive" />
              ) : (
                <Mic className="w-14 h-14 text-primary group-hover:scale-110 transition-transform duration-300" />
              )}
            </button>

            {/* Status / Live Transcript */}
            <div className="w-full max-w-md min-h-[52px] bg-black/40 border border-border/50 p-3 rounded text-center mb-3">
              {liveTranscript ? (
                <p className="font-mono text-sm text-primary animate-pulse leading-relaxed">
                  "{liveTranscript}"
                </p>
              ) : (
                <span className={`font-mono text-base font-bold uppercase ${micActive ? "text-destructive animate-pulse" : "text-primary"}`}>
                  {statusMsg}
                </span>
              )}
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="w-full max-w-md bg-destructive/10 border border-destructive/30 rounded p-3 flex items-start gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="font-mono text-xs text-destructive leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {/* AI earpiece response */}
            {aiSpeaking && (
              <div className="w-full max-w-md bg-primary/10 border border-primary/30 rounded p-3 flex items-start gap-2">
                <Volume2 className="w-4 h-4 text-primary mt-0.5 animate-pulse flex-shrink-0" />
                <p className="font-mono text-xs text-primary leading-relaxed">{aiSpeaking}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="tech-border p-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-primary">Target Sector</label>
                  <select
                    value={selectedJunction}
                    onChange={(e) => { setSelectedJunction(e.target.value); setErrorMsg(null); }}
                    className="bg-black/50 border border-border/50 text-foreground text-sm font-mono p-2.5 rounded focus:outline-none focus:border-primary transition-colors"
                    required
                  >
                    <option value="" disabled>Select junction...</option>
                    {junctions.map((j) => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-primary">Language</label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as typeof selectedLanguage)}
                    className="bg-black/50 border border-border/50 text-foreground text-sm font-mono p-2.5 rounded focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="english">English (en-US)</option>
                    <option value="tamil">Tamil (ta-IN)</option>
                    <option value="hindi">Hindi (hi-IN)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] uppercase tracking-widest text-primary">Command Input</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={micActive ? "Speak now — transcript appears here..." : "Or type a command..."}
                    className="flex-1 bg-black/50 border border-border/50 text-foreground text-sm font-mono p-2.5 rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                  <button
                    type="submit"
                    disabled={processCmd.isPending || (!inputText.trim() && !liveTranscript) || !selectedJunction}
                    className="bg-primary/20 text-primary border border-primary/50 px-5 rounded hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-mono uppercase text-sm tracking-wider"
                  >
                    {processCmd.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> TX</>}
                  </button>
                </div>
              </div>

              {/* Quick commands */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Quick Commands</label>
                <div className="flex flex-wrap gap-1.5">
                  {sampleCommands.map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => setInputText(cmd)}
                      className="px-2.5 py-1 bg-black/40 border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/50 text-[10px] font-mono rounded transition-colors"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
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
                No commands yet. Click the mic or use Quick Commands below.
              </div>
            ) : (
              [...commands].reverse().map((cmd) => (
                <div key={cmd.id} className="flex flex-col gap-2 border-b border-border/20 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-6 h-6 rounded bg-secondary flex items-center justify-center border border-border flex-shrink-0">
                      <span className="font-mono text-[9px] text-muted-foreground">OP</span>
                    </div>
                    <div className="flex-1 bg-black/30 border border-border/40 rounded p-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground">{cmd.officerName}</span>
                        <span className="font-mono text-[9px] text-muted-foreground">{formatTime(cmd.createdAt)}</span>
                      </div>
                      <p className="font-sans text-sm text-foreground">"{cmd.rawText}"</p>
                      <div className="mt-2 flex gap-1.5 flex-wrap">
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
                        <span className="px-2 py-0.5 bg-muted/20 border border-border/30 text-muted-foreground text-[9px] font-mono rounded uppercase">
                          {cmd.language}
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
