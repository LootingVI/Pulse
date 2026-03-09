"use client";

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    OrbitControls,
    Html,
    Float,
    Stars,
    Sparkles,
    PerspectiveCamera,
    Line,
    Environment,
    Icosahedron,
    Sphere,
    Torus,
    Ring
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Monitor } from '@/app/dashboard/monitors/page';
import { Activity, ShieldAlert, Cpu, Network } from 'lucide-react';

interface NodeProps {
    monitor: Monitor;
    position: [number, number, number];
    isParent: boolean;
    onClick: (monitor: Monitor) => void;
}

// ── Node Rendering ─────────────────────────────────────────────────────────────
function MonitorNode({ monitor, position, isParent, onClick }: NodeProps) {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const wireRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    const isOffline = monitor.status === 'OFFLINE';

    // Cyberpunk/Synthwave color palette
    const statusColor = isOffline ? '#ff003c' : '#00f3ff';
    const secondaryColor = isOffline ? '#aa0022' : '#0066aa';
    const glowColor = isOffline ? '#ff2a6d' : '#05ffa1';

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (groupRef.current) {
            // Subtle floating offset unique per node based on position
            groupRef.current.position.y = position[1] + Math.sin(time * 0.5 + position[0]) * 0.3;
        }
        if (coreRef.current) {
            coreRef.current.rotation.y += 0.01;
            coreRef.current.rotation.x += 0.005;
        }
        if (wireRef.current) {
            wireRef.current.rotation.y -= 0.01;
            wireRef.current.rotation.x -= 0.005;

            // Pulse the scale if offline
            if (isOffline) {
                const pulse = 1 + Math.sin(time * 6) * 0.1;
                wireRef.current.scale.set(pulse, pulse, pulse);
            }
        }
        if (ringRef.current) {
            ringRef.current.rotation.z = time * (isOffline ? 2 : 0.5);
            ringRef.current.rotation.x = Math.PI / 2 + Math.sin(time * 0.5) * 0.2;
        }
    });

    const nodeScale = isParent ? 1.5 : 1.0;

    return (
        <group
            ref={groupRef}
            position={position}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
            onClick={(e) => { e.stopPropagation(); onClick(monitor); }}
        >
            {/* The Core Energy Sphere */}
            <Sphere ref={coreRef} args={[0.4 * nodeScale, 32, 32]}>
                <meshStandardMaterial
                    color={statusColor}
                    emissive={glowColor}
                    emissiveIntensity={hovered ? 4 : (isOffline ? 6 : 2)}
                    roughness={0.2}
                    metalness={0.8}
                    transparent
                    opacity={0.9}
                />
            </Sphere>

            {/* Wireframe Shell */}
            <Icosahedron ref={wireRef} args={[0.5 * nodeScale, 1]}>
                <meshBasicMaterial
                    color={secondaryColor}
                    wireframe
                    transparent
                    opacity={0.3}
                />
            </Icosahedron>

            {/* Orbital Tech Ring */}
            <Torus ref={ringRef} args={[0.8 * nodeScale, 0.015, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
                <meshBasicMaterial color={statusColor} transparent opacity={hovered ? 0.8 : 0.4} />
            </Torus>

            {/* Warning shockwave rings if offline */}
            {isOffline && (
                <Shockwave color="#ff003c" scale={nodeScale} />
            )}

            {/* Point light to illuminate surroundings */}
            <pointLight distance={5} intensity={isOffline ? 5 : 2} color={glowColor} />

            {/* Holographic HTML Label */}
            <Html
                position={[0, 1 * nodeScale, 0]}
                center
                distanceFactor={15}
                zIndexRange={[100, 0]}
                className="transform transition-all duration-300 pointer-events-none"
                style={{
                    opacity: hovered || isOffline ? 1 : 0.7,
                    transform: hovered ? 'scale(1.1)' : 'scale(1)'
                }}
            >
                <div className={`
                    flex flex-col items-center px-4 py-2 rounded-xl backdrop-blur-xl
                    border shadow-2xl transition-colors duration-500 min-w-[120px] text-center
                    ${isOffline
                        ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_30px_rgba(255,0,60,0.5)]'
                        : 'bg-slate-950/40 border-cyan-500/30 shadow-[0_0_30px_rgba(0,243,255,0.2)]'
                    }
                `}>
                    <div className="flex flex-col items-center gap-1">
                        {isOffline ? (
                            <ShieldAlert className="w-4 h-4 text-red-400 mb-1 animate-pulse" />
                        ) : (
                            <Activity className="w-4 h-4 text-cyan-400 mb-1 opacity-50" />
                        )}
                        <span className="text-white font-bold text-sm tracking-widest uppercase drop-shadow-md whitespace-nowrap">
                            {monitor.name}
                        </span>
                        <span className={`text-[10px] font-mono tracking-wider font-bold uppercase
                            ${isOffline ? 'text-red-400 animate-pulse' : 'text-cyan-400/80'}
                        `}>
                            {monitor.status}
                        </span>
                    </div>
                </div>
            </Html>
        </group>
    );
}

// ── Pulse / Shockwave Effect ──────────────────────────────────────────────────
function Shockwave({ color, scale }: { color: string, scale: number }) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.getElapsedTime() * 2;
        const s = (t % 2) * 2 * scale; // expands from 0 to 4 * scale
        ref.current.scale.set(s, s, s);
        (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - (s / (4 * scale)));
    });

    return (
        <Ring ref={ref} args={[0.9, 1, 64]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </Ring>
    );
}

// ── Organic Connections ────────────────────────────────────────────────────────
function ConnectionLine({ start, end, status }: { start: [number, number, number], end: [number, number, number], status: string }) {
    const isOffline = status === 'OFFLINE';
    const color = isOffline ? '#ff003c' : '#00f3ff';

    // Create a sweeping organic curve 
    const curve = useMemo(() => {
        // Curve arcs slightly downwards or upwards depending on distance
        const dist = new THREE.Vector3(...start).distanceTo(new THREE.Vector3(...end));
        const midPoint = [
            (start[0] + end[0]) / 2,
            ((start[1] + end[1]) / 2) - (dist * 0.2), // Arc down
            (start[2] + end[2]) / 2
        ];
        return new THREE.CatmullRomCurve3([
            new THREE.Vector3(...start),
            new THREE.Vector3(...midPoint),
            new THREE.Vector3(...end)
        ]);
    }, [start, end]);

    const points = useMemo(() => curve.getPoints(50), [curve]);

    return (
        <group>
            {/* Base glowing line */}
            <Line
                points={points}
                color={color}
                lineWidth={1} /* Note: WebGL line width is often limited to 1 on many platforms, but it still glows via bloom */
                transparent
                opacity={0.3}
            />
            {/* Multiple packets travelling at different times */}
            <DataPacket color={color} curve={curve} speed={isOffline ? 0.1 : 0.4} offset={0} />
            {!isOffline && <DataPacket color={color} curve={curve} speed={0.4} offset={0.5} />}
        </group>
    );
}

function DataPacket({ color, curve, speed, offset }: { color: string, curve: THREE.CatmullRomCurve3, speed: number, offset: number }) {
    const packetRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!packetRef.current) return;
        const t = ((state.clock.getElapsedTime() * speed) + offset) % 1;
        const pos = curve.getPointAt(t);
        packetRef.current.position.copy(pos);
    });

    return (
        <mesh ref={packetRef}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color={color} />
            <pointLight intensity={1.5} distance={1.5} color={color} />
        </mesh>
    );
}

// ── Cyberspace Environment ─────────────────────────────────────────────────────
function CyberspaceGrid() {
    return (
        <group position={[0, -6, 0]}>
            <gridHelper args={[200, 100, '#00f3ff', '#002244']} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[200, 200]} />
                <meshBasicMaterial color="#010409" transparent opacity={0.8} />
            </mesh>
        </group>
    );
}

// ── Main Layout & Assembly ───────────────────────────────────────────────────
export function NerveSystem3D({ monitors }: { monitors: Monitor[] }) {
    const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);

    // Calculate an elegant 3D concentric layout
    const nodePositions = useMemo(() => {
        const positions: Record<string, [number, number, number]> = {};
        const parents = monitors.filter(m => !m.parentMonitorId);

        // Arrange parents in an inner circle
        parents.forEach((p, i) => {
            const angle = (i / Math.max(parents.length, 1)) * Math.PI * 2;
            const radius = 6;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            // Introduce some vertical wave variation
            const y = Math.sin(i * 1.5) * 2;
            positions[p.id] = [x, y, z];

            const children = monitors.filter(m => m.parentMonitorId === p.id);
            // Arrange children in a wider orbit around their parent, but pushed outwards from center
            children.forEach((c, j) => {
                const childAngle = angle + ((j - (children.length / 2) + 0.5) * 0.5); // Spread radially outward
                const childRadius = 12 + Math.random() * 4; // Further out

                positions[c.id] = [
                    Math.cos(childAngle) * childRadius,
                    y + (Math.random() - 0.5) * 8, // Lots of vertical variation for children
                    Math.sin(childAngle) * childRadius
                ];
            });
        });

        // Handle orphans (monitors with no parent and no children) if they accidentally got missed? 
        // We already treated all monitors without parentMonitorId as parents.
        return positions;
    }, [monitors]);

    return (
        <div className="w-full h-screen bg-[#010409] relative overflow-hidden font-sans">
            <Canvas shadows gl={{ antialias: true, alpha: false, stencil: false, depth: true }} camera={{ position: [0, 15, 30], fov: 45 }}>
                <color attach="background" args={['#010409']} />
                {/* Volumetric Fog */}
                <fogExp2 attach="fog" args={['#010409', 0.015]} />

                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={5}
                    maxDistance={80}
                    autoRotate
                    autoRotateSpeed={0.5}
                    maxPolarAngle={Math.PI / 2 + 0.1} // Allow looking slightly from below
                />

                <ambientLight intensity={0.2} />
                <directionalLight position={[10, 20, 10]} intensity={1} color="#00f3ff" />
                <directionalLight position={[-10, -20, -10]} intensity={0.5} color="#ff003c" />

                <Stars radius={100} depth={50} count={5000} factor={3} saturation={1} fade speed={0.5} />
                <Sparkles count={100} scale={30} size={2} speed={0.2} color="#00f3ff" opacity={0.2} />

                <CyberspaceGrid />

                <group position={[0, 0, 0]}>
                    {monitors.map((m) => {
                        const pos = nodePositions[m.id] || [(Math.random() - 0.5) * 10, Math.random() * 10, (Math.random() - 0.5) * 10];
                        const isParent = !m.parentMonitorId;
                        return (
                            <group key={m.id}>
                                <MonitorNode
                                    monitor={m}
                                    position={pos}
                                    isParent={isParent}
                                    onClick={(mon) => setSelectedMonitor(mon)}
                                />
                                {m.parentMonitorId && nodePositions[m.parentMonitorId] && (
                                    <ConnectionLine
                                        start={nodePositions[m.parentMonitorId]}
                                        end={pos}
                                        status={m.status}
                                    />
                                )}
                            </group>
                        );
                    })}
                </group>

                {/* Post-Processing Pipeline for True Cyberpunk Bloom */}
                <EffectComposer multisampling={4}>
                    <Bloom
                        luminanceThreshold={0.2}
                        mipmapBlur
                        intensity={2.5}
                        radius={0.6}
                    />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                </EffectComposer>

            </Canvas>

            {/* Premium Glassmorphism UI Overlay */}
            <div className="absolute inset-0 pointer-events-none p-6 md:p-8 flex flex-col justify-between z-10">
                {/* Top Bar */}
                <div className="flex justify-between items-start">
                    <div className="space-y-4">
                        <div className="px-5 py-3 bg-slate-950/60 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl flex items-center gap-4 shadow-[0_0_30px_rgba(0,243,255,0.1)]">
                            <div className="relative flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-500 font-bold mb-0.5 flex items-center gap-1.5">
                                    <Network className="w-3 h-3" />
                                    Global Telemetry
                                </span>
                                <span className="text-2xl font-black text-white tracking-tight drop-shadow-md">NERVE_SYSTEM</span>
                            </div>
                        </div>

                        <div className="space-y-3 pointer-events-auto">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold px-2">Network State Matrix</div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl border border-white/5 px-4 py-2.5 rounded-xl shadow-lg hover:bg-slate-800/80 transition-colors">
                                    <div className="w-2 h-2 rounded-full bg-[#05ffa1] shadow-[0_0_10px_#05ffa1]" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Nodes Online</span>
                                        <span className="text-sm text-white font-mono font-bold">{monitors.filter(m => m.status !== 'OFFLINE').length}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 bg-red-950/30 backdrop-blur-xl border border-red-500/20 px-4 py-2.5 rounded-xl shadow-lg hover:bg-red-950/50 transition-colors">
                                    <div className="w-2 h-2 rounded-full bg-[#ff003c] shadow-[0_0_10px_#ff003c] animate-pulse" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-red-300 uppercase font-semibold">Anomalies</span>
                                        <span className="text-sm text-red-100 font-mono font-bold">{monitors.filter(m => m.status === 'OFFLINE').length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* HUD Right Panel */}
                    <div className="bg-slate-900/60 backdrop-blur-2xl p-5 border border-white/10 rounded-3xl flex flex-col items-center gap-2 pointer-events-auto shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center justify-center p-3 rounded-full bg-cyan-500/10 mb-1">
                            <Cpu className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div className="text-[9px] text-cyan-400/70 uppercase font-bold tracking-widest">System Health</div>
                        <div className="text-3xl font-black text-white">99.9<span className="text-cyan-500">%</span></div>
                    </div>
                </div>

                {/* Bottom Overlay & Detail Panel */}
                <div className="flex justify-between items-end">
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                        ENCRYPTED_LINK_ESTABLISHED // ALL_SYSTEMS_NOMINAL
                    </div>

                    {selectedMonitor && (
                        <div className="pointer-events-auto w-96 bg-slate-950/90 backdrop-blur-3xl border border-cyan-500/30 p-6 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-8 fade-in duration-300 relative overflow-hidden group">
                            {/* Decorative gradient corner */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition-colors" />

                            <div className="flex justify-between items-start mb-6 relative">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-2 h-2 rounded-full shadow-lg ${selectedMonitor.status === 'OFFLINE' ? 'bg-[#ff003c] shadow-[#ff003c]' : 'bg-[#00f3ff] shadow-[#00f3ff]'}`} />
                                        <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Node Identifier</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-white leading-tight tracking-tight">{selectedMonitor.name}</h3>
                                </div>
                                <button onClick={() => setSelectedMonitor(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative">
                                <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">Current State</div>
                                    <div className={`text-sm font-black uppercase tracking-wider ${selectedMonitor.status === 'OFFLINE' ? 'text-[#ff003c] drop-shadow-[0_0_8px_#ff003c]' : 'text-[#00f3ff] drop-shadow-[0_0_8px_#00f3ff]'}`}>
                                        {selectedMonitor.status}
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">Protocol Type</div>
                                    <div className="text-sm font-black text-white tracking-wider">{selectedMonitor.type}</div>
                                </div>
                                <div className="col-span-2 bg-slate-900/50 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">Target Pointer</div>
                                    <div className="text-xs font-mono text-cyan-400/80 truncate break-all">{selectedMonitor.target}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Minimal X icon if lucide isn't ready in this scope
function X({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        </svg>
    );
}
