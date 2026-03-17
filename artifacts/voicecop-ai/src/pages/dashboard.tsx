import { useGetAnalyticsOverview, useListJunctions, useListAlerts, useGetCongestionData } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { SignalNode } from "@/components/signal-node";
import { Activity, AlertTriangle, Users, Cpu, ShieldCheck } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTrafficPolling } from "@/hooks/use-polling";

function StatCard({ title, value, icon: Icon, unit = "" }: any) {
  return (
    <div className="tech-border p-5 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{title}</span>
        <Icon className="w-5 h-5 text-primary opacity-70" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-3xl font-bold text-foreground glow-text">{value}</span>
        {unit && <span className="font-mono text-sm text-primary">{unit}</span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  useTrafficPolling(5000);
  
  const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsOverview();
  const { data: junctionsData, isLoading: junctionsLoading } = useListJunctions();
  const { data: alertsData, isLoading: alertsLoading } = useListAlerts();
  const { data: congestionData } = useGetCongestionData();

  const junctions = junctionsData?.junctions || [];
  const alerts = alertsData?.alerts || [];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 h-full">
        
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Active Junctions" 
            value={analyticsLoading ? "--" : analytics?.totalJunctions} 
            icon={Activity} 
          />
          <StatCard 
            title="Officers on Duty" 
            value={analyticsLoading ? "--" : analytics?.activeOfficers} 
            icon={Users} 
          />
          <StatCard 
            title="Emergency Corridors" 
            value={analyticsLoading ? "--" : analytics?.emergencyIncidentsToday} 
            icon={AlertTriangle} 
          />
          <StatCard 
            title="System Uptime" 
            value={analyticsLoading ? "--" : analytics?.uptime} 
            icon={Cpu} 
            unit="%"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0">
          
          {/* Live Junctions Map */}
          <div className="lg:col-span-2 tech-border flex flex-col h-full">
            <div className="p-4 border-b border-border/50 bg-black/20 flex justify-between items-center">
              <h2 className="font-mono text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                <RadioIcon /> Live Junction Grid
              </h2>
              <div className="flex gap-4 font-mono text-[10px] text-muted-foreground uppercase">
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-signal-green rounded-full"></div> Normal</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-accent rounded-full"></div> Congested</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-destructive rounded-full"></div> Emergency</span>
              </div>
            </div>
            
            <div className="flex-1 p-6 relative overflow-auto bg-black/40">
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                backgroundImage: `url(${import.meta.env.BASE_URL}images/map-grid.png)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}></div>
              
              {junctionsLoading ? (
                <div className="h-full flex items-center justify-center font-mono text-primary animate-pulse">Scanning Sectors...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                  {junctions.map(j => (
                    <div key={j.id} className="bg-card/80 backdrop-blur-sm border border-primary/20 rounded-md p-4 relative overflow-hidden group hover:border-primary/50 transition-colors">
                      {j.status === 'emergency' && <div className="absolute inset-0 bg-destructive/10 animate-pulse pointer-events-none"></div>}
                      
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="font-display font-bold text-lg">{j.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{j.location}</div>
                        </div>
                        <div className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider border rounded ${
                          j.status === 'emergency' ? 'bg-destructive/20 border-destructive text-destructive' :
                          j.status === 'congested' ? 'bg-accent/20 border-accent text-accent' :
                          'bg-primary/20 border-primary/30 text-primary'
                        }`}>
                          {j.status}
                        </div>
                      </div>

                      <div className="flex justify-center items-center py-4 bg-black/30 rounded border border-border/50 mb-4">
                        {/* Abstract representation of intersection signals */}
                        <div className="relative w-24 h-24">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2">
                            <SignalNode state="red" direction="North" />
                          </div>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                            <SignalNode state="green" direction="South" />
                          </div>
                          <div className="absolute left-0 top-1/2 -translate-y-1/2">
                            <SignalNode state="red" direction="West" />
                          </div>
                          <div className="absolute right-0 top-1/2 -translate-y-1/2">
                            <SignalNode state="red" direction="East" />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-2 border-t border-border/30 pt-3">
                         <div className="flex flex-col">
                            <span className="font-mono text-[9px] text-muted-foreground uppercase">Officer</span>
                            <span className="font-mono text-xs text-foreground">{j.officerName || 'Autonomous'}</span>
                         </div>
                         <div className="flex flex-col text-right">
                            <span className="font-mono text-[9px] text-muted-foreground uppercase">Congestion</span>
                            <span className="font-mono text-xs text-foreground">{j.congestionLevel}%</span>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Alerts & Chart */}
          <div className="flex flex-col gap-6 h-full">
            <div className="tech-border flex-1 flex flex-col min-h-0">
               <div className="p-4 border-b border-border/50 bg-black/20">
                  <h2 className="font-mono text-sm uppercase tracking-widest text-primary">System Alerts</h2>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {alertsLoading ? (
                    <div className="font-mono text-xs text-muted-foreground text-center mt-10">Fetching logs...</div>
                 ) : alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50">
                      <ShieldCheck className="w-10 h-10 text-primary mb-2" />
                      <span className="font-mono text-xs uppercase">All systems nominal</span>
                    </div>
                 ) : (
                    alerts.map(alert => (
                      <div key={alert.id} className={`p-3 rounded border ${
                        alert.severity === 'critical' ? 'bg-destructive/10 border-destructive/30' :
                        alert.severity === 'warning' ? 'bg-accent/10 border-accent/30' :
                        'bg-primary/5 border-primary/20'
                      }`}>
                        <div className="flex justify-between items-start mb-1">
                           <span className={`font-mono text-[10px] uppercase tracking-wider ${
                             alert.severity === 'critical' ? 'text-destructive' :
                             alert.severity === 'warning' ? 'text-accent' :
                             'text-primary'
                           }`}>[{alert.type.replace('_', ' ')}]</span>
                           <span className="font-mono text-[10px] text-muted-foreground">{formatTime(alert.createdAt)}</span>
                        </div>
                        <p className="text-sm font-light text-foreground">{alert.message}</p>
                        {alert.junctionName && (
                          <div className="mt-2 text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                            <MapPinIcon /> {alert.junctionName}
                          </div>
                        )}
                      </div>
                    ))
                 )}
               </div>
            </div>

            <div className="tech-border h-64 flex flex-col">
              <div className="p-4 border-b border-border/50 bg-black/20">
                  <h2 className="font-mono text-sm uppercase tracking-widest text-primary">Congestion Trend (24h)</h2>
               </div>
               <div className="flex-1 p-4">
                  {congestionData?.data && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={congestionData.data}>
                        <defs>
                          <linearGradient id="colorCongestion" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(184 100% 50%)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(184 100% 50%)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" vertical={false} />
                        <XAxis dataKey="hour" stroke="hsl(215 20% 65%)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(215 20% 65%)" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(222 47% 8%)', borderColor: 'hsl(184 100% 30%)' }}
                          itemStyle={{ color: 'hsl(210 40% 98%)', fontFamily: 'monospace' }}
                        />
                        <Area type="monotone" dataKey="congestionLevel" stroke="hsl(184 100% 50%)" fillOpacity={1} fill="url(#colorCongestion)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function RadioIcon() {
  return (
    <div className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
    </div>
  );
}

function MapPinIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
}
