import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useListIncidents, useCreateIncident, useUpdateIncident, useListJunctions } from "@workspace/api-client-react";
import { AlertTriangle, Plus, Crosshair, MapPin, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatTime } from "@/lib/utils";

export default function Incidents() {
  const queryClient = useQueryClient();
  const [isActivating, setIsActivating] = useState(false);
  const [targetJunction, setTargetJunction] = useState("");

  const { data: incidentsData, isLoading: incLoading } = useListIncidents();
  const { data: junctionsData } = useListJunctions();
  
  const createIncident = useCreateIncident({
    mutation: {
      onSuccess: () => {
        setIsActivating(false);
        queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      }
    }
  });

  const updateIncident = useUpdateIncident({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/incidents"] })
    }
  });

  const incidents = incidentsData?.incidents || [];
  const junctions = junctionsData?.junctions || [];

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetJunction) return;
    createIncident.mutate({
      data: {
        type: "ambulance",
        junctionId: targetJunction,
        detectedBy: "manual",
        vehicleDirection: "north"
      }
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full gap-6">
        <div className="flex justify-between items-center border-b border-border/50 pb-4">
          <div>
            <h1 className="font-display text-2xl font-bold uppercase tracking-wider glow-text flex items-center gap-3">
              <AlertTriangle className="text-primary" /> Emergency Corridors
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">Real-time incident tracking and signal overrides</p>
          </div>
          <button 
            onClick={() => setIsActivating(!isActivating)}
            className="flex items-center gap-2 bg-destructive text-destructive-foreground px-6 py-3 rounded-sm font-mono text-sm uppercase tracking-widest hover:bg-destructive/80 hover:shadow-[0_0_20px_rgba(255,0,0,0.5)] transition-all"
          >
            {isActivating ? "Cancel Action" : <><Plus className="w-4 h-4" /> Force Override</>}
          </button>
        </div>

        {isActivating && (
          <div className="tech-border p-6 bg-destructive/5 border-destructive/30 relative overflow-hidden animate-in slide-in-from-top-4">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
            <h3 className="font-display text-destructive text-lg mb-4 uppercase flex items-center gap-2">
              <Crosshair className="w-5 h-5" /> Target Sector For Override
            </h3>
            <form onSubmit={handleActivate} className="flex gap-4 items-end relative z-10">
              <div className="flex-1">
                <label className="font-mono text-[10px] uppercase text-destructive/80 mb-2 block">Sector ID</label>
                <select 
                  value={targetJunction}
                  onChange={e => setTargetJunction(e.target.value)}
                  className="w-full bg-black/60 border border-destructive/40 text-foreground p-3 rounded focus:outline-none focus:border-destructive font-mono text-sm"
                  required
                >
                  <option value="" disabled>Select sector...</option>
                  {junctions.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                </select>
              </div>
              <button 
                type="submit"
                disabled={createIncident.isPending || !targetJunction}
                className="bg-destructive text-white px-8 py-3 rounded font-mono text-sm uppercase font-bold disabled:opacity-50"
              >
                {createIncident.isPending ? "Transmitting..." : "Execute Override"}
              </button>
            </form>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0">
          <div className="lg:col-span-2 overflow-y-auto pr-2 space-y-4">
            {incLoading ? (
               <div className="text-center font-mono text-muted-foreground mt-10">Scanning for active incidents...</div>
            ) : incidents.length === 0 ? (
               <div className="tech-border p-12 flex flex-col items-center justify-center text-muted-foreground bg-card/30">
                 <CheckCircle className="w-12 h-12 mb-4 text-primary/50" />
                 <p className="font-mono uppercase tracking-widest text-sm">No Active Emergency Corridors</p>
               </div>
            ) : incidents.map(inc => (
               <div key={inc.id} className={`tech-border p-6 relative overflow-hidden group ${inc.status === 'resolved' ? 'opacity-60' : ''}`}>
                 {inc.status === 'corridor_active' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-signal-green shadow-[0_0_10px_rgba(0,255,0,0.8)] animate-pulse"></div>
                 )}
                 {inc.status === 'alerting' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive shadow-[0_0_10px_rgba(255,0,0,0.8)] animate-pulse"></div>
                 )}
                 
                 <div className="flex justify-between items-start mb-4">
                   <div>
                     <div className="flex items-center gap-3 mb-1">
                        <span className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border ${
                          inc.type === 'ambulance' ? 'bg-destructive/20 border-destructive text-destructive' :
                          inc.type === 'fire_engine' ? 'bg-accent/20 border-accent text-accent' :
                          'bg-primary/20 border-primary text-primary'
                        }`}>
                          {inc.type.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{formatTime(inc.createdAt)}</span>
                     </div>
                     <h3 className="font-display text-xl font-bold">{inc.junctionName}</h3>
                   </div>
                   <div className="text-right">
                     <span className="block font-mono text-[10px] uppercase text-muted-foreground mb-1">Status</span>
                     <span className={`font-mono text-sm uppercase tracking-wider ${
                        inc.status === 'resolved' ? 'text-muted-foreground' : 
                        inc.status === 'corridor_active' ? 'text-signal-green glow-text' : 
                        'text-destructive'
                     }`}>
                       {inc.status.replace('_', ' ')}
                     </span>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 bg-black/40 p-4 rounded border border-border/50 mt-4">
                   <div>
                     <span className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">Detected By</span>
                     <span className="font-sans text-sm">{inc.detectedBy.replace('_', ' ').toUpperCase()}</span>
                   </div>
                   <div>
                     <span className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">Approach</span>
                     <span className="font-sans text-sm">{inc.vehicleDirection?.toUpperCase() || 'UNKNOWN'} {inc.distanceMeters ? `(${inc.distanceMeters}m)` : ''}</span>
                   </div>
                 </div>

                 {inc.status !== 'resolved' && (
                   <div className="mt-4 flex gap-3 justify-end border-t border-border/30 pt-4">
                     {inc.status !== 'corridor_active' && (
                        <button 
                          onClick={() => updateIncident.mutate({ incidentId: inc.id, data: { status: 'corridor_active', corridorActive: true }})}
                          className="px-4 py-2 bg-signal-green/10 text-signal-green border border-signal-green/30 hover:bg-signal-green hover:text-black font-mono text-xs uppercase transition-colors rounded"
                        >
                          Activate Corridor
                        </button>
                     )}
                     <button 
                        onClick={() => updateIncident.mutate({ incidentId: inc.id, data: { status: 'resolved', corridorActive: false }})}
                        className="px-4 py-2 bg-muted text-foreground border border-border hover:bg-white hover:text-black font-mono text-xs uppercase transition-colors rounded"
                      >
                        Mark Resolved
                      </button>
                   </div>
                 )}
               </div>
            ))}
          </div>

          <div className="tech-border h-full p-4 flex flex-col bg-card/50">
             <div className="border-b border-border/50 pb-3 mb-4">
                <h3 className="font-mono text-sm text-primary uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Camera Feed
                </h3>
             </div>
             <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border/50 bg-black/50 rounded relative overflow-hidden">
                <div className="absolute inset-0 scanline opacity-30"></div>
                <div className="absolute top-2 right-2 flex items-center gap-2">
                   <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
                   <span className="font-mono text-[9px] text-destructive uppercase">Rec</span>
                </div>
                <Crosshair className="w-12 h-12 text-primary/20 mb-2" />
                <span className="font-mono text-xs text-muted-foreground uppercase">Awaiting Visual Lock</span>
             </div>
             <div className="mt-4">
                <h4 className="font-mono text-[10px] text-muted-foreground uppercase mb-2">Recent Detections</h4>
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-2 bg-black/40 rounded border border-border/30">
                       <span className="font-mono text-[10px] text-foreground">CAM-N-0{i}</span>
                       <span className="font-mono text-[10px] text-signal-green">Clear</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
