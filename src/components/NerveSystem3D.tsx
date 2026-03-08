"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Float, Stars, Sparkles, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Monitor } from '@/app/dashboard/monitors/page';

interface NodeProps {
    monitor: Monitor;
    position: [number, number, number];
}

function MonitorNode({ monitor, position }: NodeProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const isOffline = monitor.status === 'OFFLINE';

    useFrame((state) => {
        if (!meshRef.current) return;
        const time = state.clock.getElapsedTime();
        meshRef.current.position.y = position[1] + Math.sin(time + position[0]) * 0.1;

        if (isOffline) {
            const pulse = (Math.sin(time * 5) + 1) / 2;
            (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + pulse * 2;
        }
    });

    return (
        <group position={position}>
            <mesh ref={meshRef}>
                <sphereGeometry args={[0.3, 32, 32]} />
                <meshStandardMaterial
                    color={isOffline ? '#ef4444' : '#10b981'}
                    emissive={isOffline ? '#ef4444' : '#10b981'}
                    emissiveIntensity={isOffline ? 2 : 0.5}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <Text
                    position={[0, 0.6, 0]}
                    fontSize={0.2}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="#000"
                >
                    {monitor.name}
                </Text>
            </Float>
        </group>
    );
}

function ConnectionLine({ start, end, status }: { start: [number, number, number], end: [number, number, number], status: string }) {
    const points = useMemo(() => [
        new THREE.Vector3(...start),
        new THREE.Vector3(...end)
    ], [start, end]);

    const lineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
    const isOffline = status === 'OFFLINE';

    const lineObj = useMemo(() => {
        const mat = new THREE.LineBasicMaterial({
            color: isOffline ? '#ef4444' : '#3b82f6',
            transparent: true,
            opacity: 0.5
        });
        return new THREE.Line(lineGeometry, mat);
    }, [lineGeometry, isOffline]);

    return <primitive object={lineObj} />;
}

export function NerveSystem3D({ monitors }: { monitors: Monitor[] }) {
    // Layout nodes in a circle/tree-like structure
    const parents = monitors.filter(m => !m.parentMonitorId);

    const nodePositions = useMemo(() => {
        const positions: Record<string, [number, number, number]> = {};

        // Parent nodes in a large circle
        parents.forEach((p, i) => {
            const angle = (i / parents.length) * Math.PI * 2;
            const radius = 5;
            positions[p.id] = [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];

            // Children nodes cluster around parents
            const children = monitors.filter(m => m.parentMonitorId === p.id);
            children.forEach((c, j) => {
                const childAngle = (j / children.length) * Math.PI * 2;
                const childRadius = 2;
                positions[c.id] = [
                    positions[p.id][0] + Math.cos(childAngle) * childRadius,
                    1.5,
                    positions[p.id][2] + Math.sin(childAngle) * childRadius
                ];
            });
        });

        return positions;
    }, [monitors, parents]);

    return (
        <div className="w-full h-screen bg-slate-950">
            <Canvas shadows className="w-full h-full">
                <PerspectiveCamera makeDefault position={[0, 10, 15]} />
                <OrbitControls enableDamping autoRotate autoRotateSpeed={0.5} />

                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#3b82f6" />
                <pointLight position={[-10, 5, -10]} intensity={1} color="#10b981" />

                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <Sparkles count={50} scale={10} size={2} speed={0.5} color="#3b82f6" />

                {monitors.map((m) => {
                    const pos = nodePositions[m.id] || [0, 0, 0];
                    return (
                        <group key={m.id}>
                            <MonitorNode monitor={m} position={pos} />
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

            <div className="absolute top-4 left-4 p-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white flex flex-col gap-2">
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Nerve System Core</h2>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    <span>Operational</span>
                    <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#ef4444] ml-4" />
                    <span>Anomaly Detected</span>
                </div>
            </div>
        </div>
    );
}
