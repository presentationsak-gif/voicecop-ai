import { Link } from "wouter";
import { motion } from "framer-motion";
import { ShieldAlert, Mic, Activity, Cpu, ArrowRight, Radio } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="Smart city traffic at night"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background"></div>
      </div>

      <nav className="relative z-50 border-b border-border/20 bg-background/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-primary" />
            <span className="font-display font-bold text-2xl tracking-widest uppercase">
              VoiceCop<span className="text-primary glow-text">.AI</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="px-6 py-2.5 bg-primary/10 border border-primary text-primary font-mono text-sm uppercase tracking-widest hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all duration-300 rounded-sm">
              Enter Console
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-32 pb-24 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-6">
                <Radio className="w-3 h-3 animate-pulse" />
                Next-Gen Traffic Management
              </div>
              <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6">
                COMMAND THE CITY WITH YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 glow-text">VOICE.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-10 max-w-lg font-light leading-relaxed">
                Turning every traffic officer into a smart-city controller. VoiceCop AI uses advanced speech recognition and real-time computer vision to orchestrate traffic signals and clear emergency corridors instantly.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/dashboard" className="group flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground font-display font-bold uppercase tracking-wider rounded-sm hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-all duration-300">
                  <Activity className="w-5 h-5" />
                  Launch Live Demo
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative aspect-square max-w-lg mx-auto"
            >
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full"></div>
              <img 
                src={`${import.meta.env.BASE_URL}images/ai-core.png`} 
                alt="AI Processing Core"
                className="w-full h-full object-contain relative z-10 animate-[pulse_4s_ease-in-out_infinite]"
              />
              {/* Floating UI Elements */}
              <div className="absolute top-1/4 -left-8 p-4 bg-card/80 backdrop-blur-md border border-primary/30 rounded-sm shadow-xl z-20">
                <div className="text-[10px] font-mono text-primary uppercase mb-1">Intent Detected</div>
                <div className="font-display text-sm">"Activate Emergency Corridor"</div>
              </div>
              <div className="absolute bottom-1/3 -right-12 p-4 bg-card/80 backdrop-blur-md border border-accent/30 rounded-sm shadow-xl z-20">
                <div className="text-[10px] font-mono text-accent uppercase mb-1">AI Vision Alert</div>
                <div className="font-display text-sm">Ambulance Approaching (North)</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-card border-y border-border/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-wider mb-4">Core System Architecture</h2>
              <p className="text-muted-foreground font-mono">Three pillars of intelligent traffic control</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Mic, title: "Voice Control Link", desc: "Military-grade noise-cancelling speech recognition allows officers to command specific signals hands-free in multiple languages." },
                { icon: Cpu, title: "AI Vision Detection", desc: "Edge-computed cameras detect emergency vehicles via visual profiles and siren patterns before they reach the junction." },
                { icon: Activity, title: "IoT Orchestration", desc: "Instantaneous signal updates via secure cloud IoT controllers, automatically reverting to optimal timing after interventions." }
              ].map((feature, i) => (
                <div key={i} className="tech-border p-8 hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-14 h-14 bg-primary/10 border border-primary/30 flex items-center justify-center rounded-sm mb-6">
                    <feature.icon className="w-7 h-7 text-primary glow-text" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-3 tracking-wide">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
