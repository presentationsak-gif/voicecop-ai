import { AppLayout } from "@/components/layout";
import { motion } from "framer-motion";
import { Mic, Cpu, Cloud, Activity, ArrowRight, Shield, Radio, Server } from "lucide-react";

export default function Architecture() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  const FlowNode = ({ icon: Icon, title, desc, delay = 0, colorClass = "text-primary" }: any) => (
    <motion.div variants={itemVariants} className="relative z-10 w-64">
      <div className="tech-border p-6 bg-card/90 backdrop-blur-xl border-primary/30 hover:border-primary transition-colors text-center relative group">
        <div className={`absolute inset-0 bg-gradient-to-b from-${colorClass.split('-')[1]}/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full border-2 border-dashed ${colorClass.replace('text-', 'border-')} flex items-center justify-center bg-black/50 animate-[spin_10s_linear_infinite] group-hover:animate-none`}>
          <Icon className={`w-8 h-8 ${colorClass} animate-[spin_10s_linear_infinite_reverse] group-hover:animate-none`} />
        </div>
        <h3 className="font-display font-bold text-lg mb-2 uppercase tracking-wide">{title}</h3>
        <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );

  return (
    <AppLayout>
      <div className="h-full flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] pointer-events-none"></div>
        
        <div className="mb-8 relative z-10">
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider glow-text flex items-center gap-3">
            <Server className="text-primary" /> System Core Architecture
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Data flow & processing pipeline visualization</p>
        </div>

        <div className="flex-1 flex items-center justify-center relative min-h-[600px]">
          {/* Connecting Lines (Background) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
             <svg width="100%" height="100%" className="absolute inset-0">
               <path d="M 256, 300 L 400, 300" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" className="text-primary animate-[dash_20s_linear_infinite]" />
               <path d="M 656, 300 L 800, 300" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" className="text-primary animate-[dash_20s_linear_infinite]" />
               <path d="M 600, 150 L 600, 200" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" className="text-accent animate-[dash_20s_linear_infinite]" />
             </svg>
             <style>{`@keyframes dash { to { stroke-dashoffset: -1000; } }`}</style>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 relative"
          >
            {/* Top Parallel System (Cameras) */}
            <div className="absolute -top-48 left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:right-1/3">
               <FlowNode 
                 icon={Shield} 
                 title="AI Vision Camera" 
                 desc="Edge computer vision models detect emergency vehicles via visual profiles 300m before junction."
                 colorClass="text-accent"
               />
               <div className="absolute h-16 w-0.5 bg-accent/30 left-1/2 -bottom-16 hidden lg:block">
                 <div className="w-2 h-2 bg-accent rounded-full absolute -left-[3px] top-1/2 animate-ping"></div>
               </div>
            </div>

            <FlowNode 
              icon={Mic} 
              title="Officer Input" 
              desc="Bluetooth earpiece captures voice commands. Multilingual NLP filter active."
              colorClass="text-primary"
            />
            
            <motion.div variants={itemVariants} className="hidden lg:flex items-center text-primary/50">
              <ArrowRight className="w-8 h-8" />
            </motion.div>
            
            <FlowNode 
              icon={Cpu} 
              title="Command Engine" 
              desc="Intent classification and spatial mapping. Matches 'North' to specific junction coordinates."
              colorClass="text-primary"
            />
            
            <motion.div variants={itemVariants} className="hidden lg:flex items-center text-primary/50">
              <ArrowRight className="w-8 h-8" />
            </motion.div>
            
            <FlowNode 
              icon={Activity} 
              title="IoT Controller" 
              desc="Secure signal execution via cloud API. Failsafe checks ensure no conflicting green signals."
              colorClass="text-signal-green"
            />
          </motion.div>
        </div>
        
        <div className="mt-8 tech-border p-6 bg-black/40 text-center max-w-3xl mx-auto relative z-10">
           <h4 className="font-mono text-sm text-primary uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
             <Radio className="w-4 h-4 animate-pulse" /> Encrypted Transmission
           </h4>
           <p className="font-mono text-xs text-muted-foreground leading-relaxed">
             All communications between nodes utilize military-grade AES-256 encryption. The system maintains a constant heartbeat with fallback to local autonomous control if cloud connection is severed.
           </p>
        </div>
      </div>
    </AppLayout>
  );
}
