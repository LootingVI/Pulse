"use client";

import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
    OrbitControls,
    Text,
    Float,
    Stars,
    Sparkles,
    PerspectiveCamera,
    MeshDistortMaterial,
    GradientTexture,
    Line,
    MeshWobbleMaterial,
    Environment
} from '@react-three/drei';
import * as THREE from 'three';
import { Monitor } from '@/app/dashboard/monitors/page';

interface NodeProps {
    monitor: Monitor;
    position: [number, number, number];
    onClick: (monitor: Monitor) => void;
}

function MonitorNode({ monitor, position, onClick }: NodeProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const outerRingRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    const isOffline = monitor.status === 'OFFLINE';
    const statusColor = isOffline ? '#ff2a6d' : '#05ffa1'; // Neon pink vs Neon green
    const secondaryColor = isOffline ? '#ff0055' : '#00d2ff'; // Cyber blue/green

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (meshRef.current) {
            meshRef.current.position.y = position[1] + Math.sin(time + position[0]) * 0.15;
            meshRef.current.rotation.y += 0.01;
        }
        if (ringRef.current) {
            ringRef.current.rotation.z = time * 0.5;
            ringRef.current.rotation.x = time * 0.2;
        }
        if (outerRingRef.current) {
            outerRingRef.current.rotation.z = -time * 0.3;
            outerRingRef.current.rotation.y = time * 0.4;
        }
    });

    return (
        <group
            position={position}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onClick={() => onClick(monitor)}
        >
            {/* Core Node */}
            <mesh ref={meshRef} castShadow>
                <icosahedronGeometry args={[0.4, 2]} />
                <MeshDistortMaterial
                    color={statusColor}
                    emissive={statusColor}
                    emissiveIntensity={hovered ? 5 : 2}
                    distort={isOffline ? 0.4 : 0.2}
                    speed={2}
                    roughness={0}
                    metalness={1}
                />
            </mesh>

            {/* Inner Tech Ring */}
            <mesh ref={ringRef}>
                <torusGeometry args={[0.6, 0.01, 16, 100]} />
                <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={1} />
            </mesh>

            {/* Outer Orbital Ring */}
            <mesh ref={outerRingRef}>
                <torusGeometry args={[0.8, 0.005, 16, 100]} />
                <meshStandardMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={0.5} transparent opacity={0.4} />
            </mesh>

            {/* Glow Aura */}
            <Sparkles
                count={isOffline ? 10 : 20}
                scale={1.2}
                size={2}
                speed={0.3}
                color={statusColor}
                opacity={0.5}
            />

            {/* Label */}
            <Float speed={3} rotationIntensity={0.2} floatIntensity={0.5}>
                <Text
                    position={[0, 0.9, 0]}
                    fontSize={0.25}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.03}
                    outlineColor="#000"
                >
                    {monitor.name.toUpperCase()}
                </Text>
                <Text
                    position={[0, 0.7, 0]}
                    fontSize={0.12}
                    color={statusColor}
                    anchorX="center"
                    anchorY="middle"
                >
                    {isOffline ? "ANOMALY" : "ACTIVE"}
                </Text>
            </Float>
        </group>
    );
}

function ConnectionLine({ start, end, status }: { start: [number, number, number], end: [number, number, number], status: string }) {
    const isOffline = status === 'OFFLINE';
    const color = isOffline ? '#ff2a6d' : '#05ffa1';

    // Create a curved path
    const curve = useMemo(() => {
        const midPoint = [
            (start[0] + end[0]) / 2,
            (start[1] + end[1]) / 2 + 1.5, // Arc upwards
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
            <Line
                points={points}
                color={color}
                lineWidth={1}
                transparent
                opacity={0.3}
            />
            <DataPacket color={color} curve={curve} speed={isOffline ? 0.2 : 0.5} />
        </group>
    );
}

function DataPacket({ color, curve, speed }: { color: string, curve: THREE.CatmullRomCurve3, speed: number }) {
    const packetRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!packetRef.current) return;
        const t = (state.clock.getElapsedTime() * speed) % 1;
        const pos = curve.getPointAt(t);
        packetRef.current.position.copy(pos);
    });

    return (
        <mesh ref={packetRef}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color={color} />
        </mesh>
    );
}

function GroundGrid() {
    return (
        <gridHelper
            args={[100, 50, '#1e293b', '#0f172a']}
            position={[0, -2, 0]}
            rotation={[0, 0, 0]}
        />
    );
}

export function NerveSystem3D({ monitors }: { monitors: Monitor[] }) {
    const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);

    const nodePositions = useMemo(() => {
        const positions: Record<string, [number, number, number]> = {};
        const parents = monitors.filter(m => !m.parentMonitorId);

        // Arrange parents in a dynamic layout
        parents.forEach((p, i) => {
            const angle = (i / parents.length) * Math.PI * 2;
            const radius = 8 + Math.sin(i) * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = Math.sin(i * 0.5) * 2;
            positions[p.id] = [x, y, z];

            const children = monitors.filter(m => m.parentMonitorId === p.id);
            children.forEach((c, j) => {
                const childAngle = (j / (children.length || 1)) * Math.PI * 2;
                const childRadius = 3;
                positions[c.id] = [
                    x + Math.cos(childAngle) * childRadius,
                    y + 2 + Math.sin(j) * 1,
                    z + Math.sin(childAngle) * childRadius
                ];
            });
        });

        return positions;
    }, [monitors]);

    return (
        <div className="w-full h-screen bg-[#020617] relative overflow-hidden font-sans">
            <Canvas shadows gl={{ antialias: true }}>
                <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={50} />
                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={5}
                    maxDistance={40}
                    autoRotate
                    autoRotateSpeed={0.3}
                />

                <color attach="background" args={['#020617']} />
                <fog attach="fog" args={['#020617', 10, 50]} />

                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={2} color="#00d2ff" />
                <pointLight position={[-10, -10, -10]} intensity={1} color="#ff0055" />
                <spotLight position={[0, 20, 0]} angle={0.3} penumbra={1} intensity={1} castShadow />

                <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={1} />
                <Environment preset="night" />

                <GroundGrid />

                {monitors.map((m) => {
                    const pos = nodePositions[m.id] || [0, 0, 0];
                    return (
                        <group key={m.id}>
                            <MonitorNode
                                monitor={m}
                                position={pos}
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
            </Canvas>

            {/* Cyber HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div className="space-y-4">
                        <div className="px-4 py-2 bg-blue-500/10 backdrop-blur-md border border-blue-500/20 rounded-lg flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">Neural Engine</span>
                                <span className="text-xl font-black text-white">NERVE SYSTEM v4.0</span>
                            </div>
                        </div>

                        <div className="space-y-2 pointer-events-auto">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold px-1">Network Status</div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3 bg-black/40 border border-white/5 p-2 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#05ffa1]" />
                                    <span className="text-[10px] text-slate-300 font-mono">ALL NODES OPERATIONAL: {monitors.filter(m => m.status !== 'OFFLINE').length}</span>
                                </div>
                                <div className="flex items-center gap-3 bg-black/40 border border-white/5 p-2 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff2a6d]" />
                                    <span className="text-[10px] text-slate-300 font-mono">ANOMALIES DETECTED: {monitors.filter(m => m.status === 'OFFLINE').length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl p-4 border border-white/10 rounded-2xl flex flex-col items-center gap-1 pointer-events-auto">
                        <div className="text-[8px] text-white/40 uppercase font-bold">Uptime Avg</div>
                        <div className="text-2xl font-black text-emerald-400">99.98%</div>
                    </div>
                </div>

                <div className="flex justify-between items-end">
                    <div className="text-[10px] text-slate-600 font-mono">
                        LATENCY_SCAN_ACTIVE // REGION_GLOBAL // ENCRYPTION_AES256
                    </div>

                    {selectedMonitor && (
                        <div className="pointer-events-auto w-80 bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl animate-in slide-in-from-bottom-10 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-white leading-tight">{selectedMonitor.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-mono">{selectedMonitor.target}</p>
                                </div>
                                <button onClick={() => setSelectedMonitor(null)} className="text-slate-500 hover:text-white transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                                    <div className="text-[8px] uppercase text-slate-500 font-bold">Status</div>
                                    <div className={`text-xs font-bold ${selectedMonitor.status === 'OFFLINE' ? 'text-[#ff2a6d]' : 'text-[#05ffa1]'}`}>
                                        {selectedMonitor.status}
                                    </div>
                                </div>
                                <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                                    <div className="text-[8px] uppercase text-slate-500 font-bold">Type</div>
                                    <div className="text-xs font-bold text-white">{selectedMonitor.type}</div>
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
