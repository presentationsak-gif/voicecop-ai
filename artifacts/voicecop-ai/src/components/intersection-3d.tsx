import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Text } from "@react-three/drei";
import * as THREE from "three";

interface SignalStates {
  north: "red" | "yellow" | "green";
  south: "red" | "yellow" | "green";
  east: "red" | "yellow" | "green";
  west: "red" | "yellow" | "green";
}

interface Props {
  signalStates?: SignalStates;
  emergencyActive?: boolean;
  detectedVehicle?: "ambulance" | "firetruck" | null;
}

const SIGNAL_COLOR = {
  red: "#ff2020",
  yellow: "#ffcc00",
  green: "#00ff44",
};

function Road() {
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0a0f1a" />
      </mesh>
      {/* E-W road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[60, 10]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {/* N-S road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[10, 60]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {/* Center intersection highlight */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#141428" />
      </mesh>
      {/* Road markings E-W */}
      {[-20, -10, 0, 10, 20].map((x, i) => (
        <mesh key={`ew-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, -3.5]}>
          <planeGeometry args={[3, 0.3]} />
          <meshStandardMaterial color="#ffffff" opacity={0.6} transparent />
        </mesh>
      ))}
      {[-20, -10, 0, 10, 20].map((x, i) => (
        <mesh key={`ew2-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 3.5]}>
          <planeGeometry args={[3, 0.3]} />
          <meshStandardMaterial color="#ffffff" opacity={0.6} transparent />
        </mesh>
      ))}
      {/* Road markings N-S */}
      {[-20, -10, 0, 10, 20].map((z, i) => (
        <mesh key={`ns-${i}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[3.5, 0.02, z]}>
          <planeGeometry args={[3, 0.3]} />
          <meshStandardMaterial color="#ffffff" opacity={0.6} transparent />
        </mesh>
      ))}
      {[-20, -10, 0, 10, 20].map((z, i) => (
        <mesh key={`ns2-${i}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[-3.5, 0.02, z]}>
          <planeGeometry args={[3, 0.3]} />
          <meshStandardMaterial color="#ffffff" opacity={0.6} transparent />
        </mesh>
      ))}
      {/* City blocks (corner buildings) */}
      {[
        [18, 18], [-18, 18], [18, -18], [-18, -18],
      ].map(([x, z], i) => (
        <group key={`block-${i}`} position={[x, 0, z]}>
          <mesh position={[0, 2, 0]} castShadow>
            <boxGeometry args={[14, 4, 14]} />
            <meshStandardMaterial color="#0d1425" />
          </mesh>
          {[0, 2, 4, 6].map((row) =>
            [0, 2, 4].map((col) => (
              <mesh key={`win-${row}-${col}`} position={[-3 + col * 2, row - 1.5, 7.01]}>
                <planeGeometry args={[0.8, 0.8]} />
                <meshStandardMaterial
                  color={Math.random() > 0.4 ? "#00e5ff" : "#ff8c00"}
                  emissive={Math.random() > 0.4 ? "#00e5ff" : "#ff8c00"}
                  emissiveIntensity={0.3}
                />
              </mesh>
            ))
          )}
        </group>
      ))}
    </group>
  );
}

function TrafficLight({ position, direction, state }: { position: [number, number, number]; direction: string; state: "red" | "yellow" | "green" }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 3, 8]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* Housing */}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[0.6, 1.8, 0.4]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Red light */}
      <mesh position={[0, 3.8, 0.21]}>
        <circleGeometry args={[0.18, 16]} />
        <meshStandardMaterial
          color="#ff2020"
          emissive="#ff2020"
          emissiveIntensity={state === "red" ? 2.5 : 0.1}
        />
      </mesh>
      {/* Yellow light */}
      <mesh position={[0, 3.2, 0.21]}>
        <circleGeometry args={[0.18, 16]} />
        <meshStandardMaterial
          color="#ffcc00"
          emissive="#ffcc00"
          emissiveIntensity={state === "yellow" ? 2.5 : 0.1}
        />
      </mesh>
      {/* Green light */}
      <mesh position={[0, 2.6, 0.21]}>
        <circleGeometry args={[0.18, 16]} />
        <meshStandardMaterial
          color="#00ff44"
          emissive="#00ff44"
          emissiveIntensity={state === "green" ? 2.5 : 0.1}
        />
      </mesh>
      {/* Glow point light when green/red */}
      {state === "green" && (
        <pointLight position={[0, 2.6, 0.5]} color="#00ff44" intensity={1.5} distance={4} />
      )}
      {state === "red" && (
        <pointLight position={[0, 3.8, 0.5]} color="#ff2020" intensity={1.5} distance={4} />
      )}
    </group>
  );
}

interface VehicleProps {
  color: string;
  roofColor?: string;
  type?: "car" | "ambulance" | "firetruck";
  path: "ew" | "ns";
  speed: number;
  lane: number;
  startOffset: number;
  emergencyActive?: boolean;
}

function Vehicle({ color, roofColor, type = "car", path, speed, lane, startOffset, emergencyActive }: VehicleProps) {
  const ref = useRef<THREE.Group>(null);
  const timeRef = useRef(startOffset);
  const lightRef = useRef<THREE.PointLight>(null);
  const blinkRef = useRef(0);

  const isEmergency = type === "ambulance" || type === "firetruck";

  useFrame((_, delta) => {
    if (!ref.current) return;
    timeRef.current += delta * speed;
    const t = ((timeRef.current % 60) + 60) % 60;
    const pos = t - 30;

    if (emergencyActive && isEmergency) {
      if (path === "ew") {
        ref.current.position.set(pos, 0.6, lane);
        ref.current.rotation.y = speed > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        ref.current.position.set(lane, 0.6, pos);
        ref.current.rotation.y = speed > 0 ? 0 : Math.PI;
      }
      // Fast siren blink
      blinkRef.current += delta * 8;
      if (lightRef.current) {
        lightRef.current.intensity = Math.sin(blinkRef.current) > 0 ? 4 : 0;
        lightRef.current.color.setHex(Math.sin(blinkRef.current) > 0 ? 0xff0000 : 0x0044ff);
      }
    } else if (!emergencyActive && isEmergency) {
      // Park off-screen when not active
      ref.current.position.set(100, 0, 100);
    } else if (!isEmergency) {
      if (path === "ew") {
        ref.current.position.set(pos, 0.6, lane);
        ref.current.rotation.y = speed > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        ref.current.position.set(lane, 0.6, pos);
        ref.current.rotation.y = speed > 0 ? 0 : Math.PI;
      }
    }
  });

  const length = type === "car" ? 2.2 : 3;
  const width = type === "car" ? 1.1 : 1.5;
  const height = type === "car" ? 0.8 : 1;

  return (
    <group ref={ref} position={[startOffset - 30, 0.6, lane]}>
      {/* Body */}
      <mesh castShadow>
        <boxGeometry args={[width, height, length]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Roof/cab */}
      {type !== "car" && (
        <mesh position={[0, height * 0.7, length * 0.1]}>
          <boxGeometry args={[width * 0.95, height * 0.5, length * 0.5]} />
          <meshStandardMaterial color={roofColor ?? color} />
        </mesh>
      )}
      {type === "car" && (
        <mesh position={[0, height * 0.65, 0]}>
          <boxGeometry args={[width * 0.85, height * 0.5, length * 0.55]} />
          <meshStandardMaterial color={roofColor ?? "#1e293b"} transparent opacity={0.85} />
        </mesh>
      )}
      {/* Emergency lights */}
      {isEmergency && (
        <>
          <mesh position={[0, height + 0.15, 0]}>
            <boxGeometry args={[width * 0.8, 0.2, 0.6]} />
            <meshStandardMaterial
              color={type === "ambulance" ? "#ff0000" : "#ffcc00"}
              emissive={type === "ambulance" ? "#ff0000" : "#ffcc00"}
              emissiveIntensity={2}
            />
          </mesh>
          <pointLight ref={lightRef} position={[0, height + 0.5, 0]} color="#ff0000" intensity={0} distance={8} />
        </>
      )}
      {/* Cross mark on ambulance */}
      {type === "ambulance" && (
        <>
          <mesh position={[0.001, height * 0.3, 0]}>
            <boxGeometry args={[0.08, 0.5, 0.15]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
          </mesh>
          <mesh position={[0.001, height * 0.3, 0]}>
            <boxGeometry args={[0.08, 0.15, 0.5]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
          </mesh>
        </>
      )}
      {/* Headlights */}
      <mesh position={[width * 0.35, -0.1, length * 0.5]}>
        <boxGeometry args={[0.25, 0.15, 0.05]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffcc" emissiveIntensity={1} />
      </mesh>
      <mesh position={[-width * 0.35, -0.1, length * 0.5]}>
        <boxGeometry args={[0.25, 0.15, 0.05]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffcc" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

function EmergencyFlash({ active }: { active: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta * 6;
    if (lightRef.current) {
      lightRef.current.intensity = active ? Math.abs(Math.sin(t.current)) * 6 : 0;
    }
  });
  return <pointLight ref={lightRef} position={[0, 10, 0]} color="#ff2020" distance={40} />;
}

function Scene({ signalStates, emergencyActive, detectedVehicle }: Props) {
  const defaultStates: SignalStates = useMemo(() => ({
    north: "red", south: "green", east: "red", west: "red",
  }), []);

  const signals = signalStates ?? defaultStates;

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={0.6} castShadow />
      <pointLight position={[0, 8, 0]} color="#00e5ff" intensity={0.4} distance={30} />
      <EmergencyFlash active={!!emergencyActive} />

      <Road />

      {/* Traffic Lights */}
      <TrafficLight position={[5.5, 0, -5.5]} direction="N" state={signals.north} />
      <TrafficLight position={[-5.5, 0, 5.5]} direction="S" state={signals.south} />
      <TrafficLight position={[5.5, 0, 5.5]} direction="E" state={signals.east} />
      <TrafficLight position={[-5.5, 0, -5.5]} direction="W" state={signals.west} />

      {/* Regular cars E-W */}
      <Vehicle color="#1e40af" roofColor="#172554" path="ew" speed={3} lane={-2.2} startOffset={5} />
      <Vehicle color="#065f46" roofColor="#064e3b" path="ew" speed={2.5} lane={-2.2} startOffset={22} />
      <Vehicle color="#374151" roofColor="#1f2937" path="ew" speed={2} lane={2.2} startOffset={40} />
      <Vehicle color="#7c3aed" roofColor="#5b21b6" path="ew" speed={2.8} lane={2.2} startOffset={55} />

      {/* Regular cars N-S */}
      <Vehicle color="#0f766e" roofColor="#0d9488" path="ns" speed={2.2} lane={2.2} startOffset={10} />
      <Vehicle color="#92400e" roofColor="#78350f" path="ns" speed={3.2} lane={-2.2} startOffset={30} />
      <Vehicle color="#1e3a5f" roofColor="#172d45" path="ns" speed={2.6} lane={2.2} startOffset={50} />

      {/* Emergency vehicles (only visible when emergency is active) */}
      <Vehicle
        color="#f8fafc"
        roofColor="#cbd5e1"
        type="ambulance"
        path="ew"
        speed={emergencyActive ? 5 : 0}
        lane={-2.2}
        startOffset={0}
        emergencyActive={emergencyActive}
      />
      <Vehicle
        color="#dc2626"
        roofColor="#b91c1c"
        type="firetruck"
        path="ns"
        speed={emergencyActive ? 4.5 : 0}
        lane={2.2}
        startOffset={10}
        emergencyActive={emergencyActive}
      />

      {/* Camera (orbit control) */}
      <OrbitControls
        enablePan={false}
        minDistance={15}
        maxDistance={55}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function Intersection3D({ signalStates, emergencyActive, detectedVehicle }: Props) {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [22, 20, 22], fov: 45 }}
        shadows
        style={{ background: "transparent" }}
        gl={{ antialias: true }}
      >
        <Scene signalStates={signalStates} emergencyActive={emergencyActive} detectedVehicle={detectedVehicle} />
      </Canvas>

      {/* Overlay labels */}
      <div className="absolute top-3 left-3 font-mono text-[10px] text-primary/70 uppercase tracking-widest pointer-events-none">
        Live Simulation — 3D Junction View
      </div>
      {emergencyActive && (
        <div className="absolute top-3 right-3 animate-pulse bg-destructive/20 border border-destructive text-destructive font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded">
          ⚠ Emergency Corridor Active
        </div>
      )}
      <div className="absolute bottom-3 right-3 font-mono text-[9px] text-muted-foreground pointer-events-none">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
