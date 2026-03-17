import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { useProcessCommand, useListCommands, useListJunctions } from "@workspace/api-client-react";
import { Mic, Send, Volume2, History, ChevronRight } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function VoiceInterface() {
  const [inputText, setInputText] = useState("");
  const [selectedJunction, setSelectedJunction] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const endOfLogRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: junctionsData } = useListJunctions();
  const { data: commandsData, isLoading: cmdsLoading } = useListCommands({ limit: 50 });
  const processCmd = useProcessCommand({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
      }
    }
  });

  const junctions = junctionsData?.junctions || [];
  const commands = commandsData?.commands || [];

  useEffect(() => {
    endOfLogRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commands]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedJunction) return;

    processCmd.mutate({
      data: {
        officerId: "OP-7742",
        junctionId: selectedJunction,
        rawText: inputText,
        language: "english"
      }
    });
    setInputText("");
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Simulate speech-to-text
    if (!isRecording) {
      setTimeout(() => {
        setInputText("Activate emergency corridor north bound");
        setIsRecording(false);
      }, 2000);
    }
  };

  return (
    <AppLayout>
      <div className="grid lg:grid-cols-2 gap-8 h-full">
        
        {/* Left: Input Panel */}
        <div className="flex flex-col gap-6 h-full">
          <div className="tech-border flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-card to-background relative overflow-hidden">
            <div className="absolute inset-0 scanline"></div>
            
            <h2 className="font-display text-2xl font-bold uppercase tracking-widest mb-12 glow-text">Voice Command Array</h2>
            
            <button 
              type="button"
              onClick={toggleRecording}
              className={`relative group w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 mb-12 ${
                isRecording 
                  ? 'bg-destructive/20 border-2 border-destructive shadow-[0_0_50px_rgba(255,0,0,0.4)]' 
                  : 'bg-primary/5 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_30px_rgba(0,240,255,0.3)]'
              }`}
            >
              {isRecording && (
                <>
                  <div className="absolute inset-0 rounded-full border border-destructive animate-ping opacity-75"></div>
                  <div className="absolute -inset-4 rounded-full border border-destructive/50 animate-ping animation-delay-300 opacity-50"></div>
                </>
              )}
              <Mic className={`w-16 h-16 ${isRecording ? 'text-destructive' : 'text-primary group-hover:scale-110'} transition-transform duration-300`} />
            </button>
            
            <div className="w-full max-w-md bg-black/40 border border-border/50 p-4 rounded text-center">
              <span className="font-mono text-sm text-muted-foreground uppercase tracking-widest block mb-2">Status</span>
              <span className={`font-mono text-lg font-bold uppercase ${isRecording ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                {isRecording ? "Listening..." : "Awaiting Input"}
              </span>
            </div>
          </div>

          <div className="tech-border p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] uppercase tracking-widest text-primary">Target Sector</label>
                <select 
                  value={selectedJunction} 
                  onChange={e => setSelectedJunction(e.target.value)}
                  className="bg-black/50 border border-border/50 text-foreground text-sm font-mono p-3 rounded focus:outline-none focus:border-primary transition-colors"
                  required
                >
                  <option value="" disabled>Select target junction...</option>
                  {junctions.map(j => (
                    <option key={j.id} value={j.id}>{j.name} ({j.id})</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] uppercase tracking-widest text-primary">Manual Override Input</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Type fallback command..." 
                    className="flex-1 bg-black/50 border border-border/50 text-foreground text-sm font-mono p-3 rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                  <button 
                    type="submit" 
                    disabled={processCmd.isPending || !inputText || !selectedJunction}
                    className="bg-primary/20 text-primary border border-primary/50 px-6 rounded hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-mono uppercase text-sm tracking-wider"
                  >
                    {processCmd.isPending ? "..." : <><Send className="w-4 h-4" /> TX</>}
                  </button>
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
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {cmdsLoading ? (
               <div className="text-center font-mono text-muted-foreground text-xs mt-10">Decrypting logs...</div>
            ) : commands.map((cmd) => (
               <div key={cmd.id} className="flex flex-col gap-2 border-b border-border/20 pb-4">
                 {/* Officer Input */}
                 <div className="flex items-start gap-3">
                   <div className="mt-1 w-6 h-6 rounded bg-secondary flex items-center justify-center border border-border">
                     <span className="font-mono text-[9px] text-muted-foreground">OP</span>
                   </div>
                   <div className="flex-1 bg-black/30 border border-border/40 rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{cmd.officerName}</span>
                        <span className="font-mono text-[9px] text-muted-foreground">{formatTime(cmd.createdAt)}</span>
                      </div>
                      <p className="font-sans text-sm text-foreground">"{cmd.rawText}"</p>
                      
                      <div className="mt-3 flex gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-mono uppercase rounded">Intent: {cmd.intent}</span>
                        <span className={`px-2 py-0.5 border text-[9px] font-mono uppercase rounded ${
                          cmd.status === 'executed' ? 'bg-signal-green/10 border-signal-green/30 text-signal-green' :
                          cmd.status === 'rejected' ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                          'bg-accent/10 border-accent/30 text-accent'
                        }`}>
                          Status: {cmd.status}
                        </span>
                      </div>
                   </div>
                 </div>

                 {/* AI Response */}
                 {cmd.aiResponse && (
                   <div className="flex items-start gap-3 ml-8">
                     <div className="mt-1 w-6 h-6 rounded bg-primary/20 flex items-center justify-center border border-primary/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                       <Volume2 className="w-3 h-3 text-primary" />
                     </div>
                     <div className="flex-1 bg-primary/5 border border-primary/20 rounded p-3 relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary"></div>
                        <p className="font-mono text-xs text-primary leading-relaxed">{cmd.aiResponse}</p>
                     </div>
                   </div>
                 )}
               </div>
            ))}
            <div ref={endOfLogRef} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
