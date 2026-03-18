import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Mic, LayoutDashboard, AlertTriangle, ShieldAlert, Cpu, Activity, LogOut, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Control Center", icon: LayoutDashboard },
    { href: "/voice", label: "Voice Interface", icon: Mic },
    { href: "/surveillance", label: "Camera & Sim", icon: Camera },
    { href: "/incidents", label: "Active Incidents", icon: AlertTriangle },
    { href: "/architecture", label: "System Core", icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-50 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]"></div>
      </div>

      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/80 backdrop-blur-xl flex flex-col relative z-20">
        <div className="h-16 flex items-center px-6 border-b border-border/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5"></div>
          <ShieldAlert className="w-6 h-6 text-primary mr-3 animate-pulse" />
          <span className="font-display font-bold text-lg tracking-wider glow-text uppercase">
            VoiceCop<span className="text-primary">.AI</span>
          </span>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-2 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-mono mb-2 pl-2">
            System Modules
          </div>
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group relative overflow-hidden",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/30 shadow-[inset_0_0_15px_rgba(0,240,255,0.1)]" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(0,240,255,0.8)]"></div>
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary glow-text" : "")} />
                <span className="font-mono text-sm uppercase tracking-wide">{item.label}</span>
                {isActive && (
                  <Activity className="w-3 h-3 absolute right-4 text-primary animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center justify-between px-2 py-2 mb-4 bg-black/40 rounded border border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-signal-green shadow-[0_0_5px_rgba(0,255,0,0.8)] animate-pulse"></div>
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Sys Online</span>
            </div>
            <span className="font-mono text-xs text-primary">v2.4.1</span>
          </div>
          <Link href="/" className="flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-destructive transition-colors text-sm font-mono uppercase">
            <LogOut className="w-4 h-4" />
            Exit Console
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col h-screen overflow-hidden bg-background">
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-8 bg-card/40 backdrop-blur-sm">
          <div className="flex items-center gap-4">
             <div className="px-2 py-1 bg-primary/10 border border-primary/20 rounded font-mono text-xs text-primary tracking-widest uppercase">
               Sector Alpha
             </div>
             <span className="font-mono text-sm text-muted-foreground">Coordinates: 34.0522° N, 118.2437° W</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex flex-col text-right">
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Operator ID</span>
                <span className="font-mono text-sm text-foreground">OP-7742</span>
             </div>
             <div className="w-10 h-10 rounded-sm bg-secondary border border-border flex items-center justify-center overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center">
                  <span className="font-display font-bold text-primary">OP</span>
                </div>
             </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
