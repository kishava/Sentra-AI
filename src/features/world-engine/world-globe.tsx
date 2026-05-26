"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { WorldMapSignal } from "@/types/world-engine";

type GlobeProps = {
  signals: WorldMapSignal[];
  activeSignal?: string;
  cinematic?: boolean;
  onSelect?: (signal: WorldMapSignal) => void;
};

const colors = {
  low: "#4ade80",
  medium: "#53f4ff",
  high: "#fbbf24",
  critical: "#ff4f91",
};

function positionFor(latitude: number, longitude: number, radius = 2.02) {
  const phi = (90 - latitude) * (Math.PI / 180);
  const theta = (longitude + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function ActivityPoint({
  signal,
  selected,
  onSelect,
}: {
  signal: WorldMapSignal;
  selected: boolean;
  onSelect?: (signal: WorldMapSignal) => void;
}) {
  const point = useMemo(() => positionFor(signal.latitude, signal.longitude), [signal.latitude, signal.longitude]);
  const ring = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null);
  const marker = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const phase = clock.elapsedTime * 2 + signal.longitude;
    const scale = 1 + (Math.sin(phase) + 1) * 0.22 + (selected ? 0.25 : 0);
    ring.current?.scale.setScalar(scale);
    if (ring.current) ring.current.material.opacity = 0.18 + ((Math.sin(phase) + 1) / 2) * 0.35;
    marker.current?.scale.setScalar(selected ? 1.5 : 1 + Math.sin(phase) * 0.12);
  });

  return (
    <group position={point}>
      <mesh ref={ring}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshBasicMaterial color={colors[signal.severity]} transparent opacity={0.32} wireframe />
      </mesh>
      <mesh ref={marker} onClick={() => onSelect?.(signal)}>
        <sphereGeometry args={[0.045 + signal.intensity / 3000, 14, 14]} />
        <meshBasicMaterial color={colors[signal.severity]} />
      </mesh>
      <pointLight color={colors[signal.severity]} intensity={selected ? 1.8 : 0.45} distance={0.75} />
    </group>
  );
}

function Arc({ from, to }: { from: WorldMapSignal; to: WorldMapSignal }) {
  const geometry = useMemo(() => {
    const start = positionFor(from.latitude, from.longitude, 2.04);
    const end = positionFor(to.latitude, to.longitude, 2.04);
    const midpoint = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(2.65);
    const curve = new THREE.QuadraticBezierCurve3(start, midpoint, end);
    return new THREE.TubeGeometry(curve, 38, 0.008, 6, false);
  }, [from, to]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#53f4ff" transparent opacity={0.33} />
    </mesh>
  );
}

function Stars() {
  const positions = useMemo(() => {
    const points = new Float32Array(240 * 3);
    for (let index = 0; index < 240; index += 1) {
      const radius = 5 + ((index * 17) % 34) / 12;
      const theta = index * 2.399;
      const phi = Math.acos(1 - (2 * (index + 0.5)) / 240);
      points[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      points[index * 3 + 1] = radius * Math.cos(phi);
      points[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return points;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#8be9ff" size={0.025} opacity={0.5} transparent />
    </points>
  );
}

function IntelligenceSphere({ signals, activeSignal, cinematic, onSelect }: GlobeProps) {
  const globe = useRef<THREE.Group>(null);
  const reduceMotion = useReducedMotion();

  useFrame((_, delta) => {
    if (globe.current && !reduceMotion) globe.current.rotation.y += delta * (cinematic ? 0.15 : 0.035);
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight color="#53f4ff" intensity={1.2} position={[3, 2, 4]} />
      <Stars />
      <group ref={globe} rotation={[0.17, 0.35, 0]}>
        <mesh>
          <sphereGeometry args={[2, 54, 54]} />
          <meshPhongMaterial color="#071426" emissive="#061424" specular="#53f4ff" shininess={28} transparent opacity={0.94} />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.015, 32, 32]} />
          <meshBasicMaterial color="#53f4ff" wireframe transparent opacity={0.075} />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.08, 36, 36]} />
          <meshBasicMaterial color="#6272ff" transparent opacity={0.035} />
        </mesh>
        {signals.slice(0, -1).map((signal, index) => (
          <Arc key={`${signal.id}-arc-${index}`} from={signal} to={signals[index + 1]} />
        ))}
        {signals.map((signal, index) => (
          <ActivityPoint key={`${signal.id}-${index}`} signal={signal} selected={signal.id === activeSignal} onSelect={onSelect} />
        ))}
      </group>
    </>
  );
}

export default function WorldGlobe({ signals, activeSignal, cinematic, onSelect }: GlobeProps) {
  return (
    <Canvas camera={{ position: [0, 0, 6.4], fov: 42 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <IntelligenceSphere signals={signals} activeSignal={activeSignal} cinematic={cinematic} onSelect={onSelect} />
    </Canvas>
  );
}
