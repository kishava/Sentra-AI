"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function CoreSystem() {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const ringC = useRef<THREE.Mesh>(null);
  const nodes = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const angle = (index / 18) * Math.PI * 2;
        const radius = 2.1 + (index % 3) * 0.28;
        return {
          position: new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle * 1.7) * 0.28, Math.sin(angle) * radius),
          scale: 0.035 + (index % 4) * 0.008,
        };
      }),
    [],
  );

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = time * 0.22;
      group.current.rotation.x = Math.sin(time * 0.35) * 0.08;
    }
    if (core.current) {
      core.current.rotation.x = time * 0.34;
      core.current.rotation.y = time * 0.48;
    }
    if (ringA.current) ringA.current.rotation.z = time * 0.36;
    if (ringB.current) ringB.current.rotation.x = Math.PI / 2 + time * 0.24;
    if (ringC.current) ringC.current.rotation.y = Math.PI / 2 - time * 0.28;
  });

  return (
    <group ref={group}>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.92, 2]} />
        <meshStandardMaterial color="#8eefff" emissive="#2fd7ff" emissiveIntensity={0.42} roughness={0.18} metalness={0.52} />
      </mesh>
      <mesh scale={1.05}>
        <icosahedronGeometry args={[0.92, 1]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.18} />
      </mesh>
      <mesh ref={ringA} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.55, 0.018, 18, 160]} />
        <meshStandardMaterial color="#53f4ff" emissive="#53f4ff" emissiveIntensity={1.2} roughness={0.32} />
      </mesh>
      <mesh ref={ringB} rotation={[Math.PI / 2, 0.5, 0.1]}>
        <torusGeometry args={[1.92, 0.012, 18, 160]} />
        <meshStandardMaterial color="#8b7cff" emissive="#8b7cff" emissiveIntensity={0.75} roughness={0.28} />
      </mesh>
      <mesh ref={ringC} rotation={[0.2, Math.PI / 2, 0.2]}>
        <torusGeometry args={[2.32, 0.01, 18, 180]} />
        <meshStandardMaterial color="#ff65dd" emissive="#ff65dd" emissiveIntensity={0.55} roughness={0.3} />
      </mesh>
      {nodes.map((node, index) => (
        <mesh key={index} position={node.position} scale={node.scale}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color={index % 2 ? "#9ca8ff" : "#54f4ff"} emissive={index % 2 ? "#7b6cff" : "#53f4ff"} emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function HeroVisual() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(83,244,255,0.18),transparent_38%),radial-gradient(circle_at_65%_70%,rgba(168,85,247,0.18),transparent_46%)] blur-xl" />
      <Canvas
        camera={{ position: [0, 0.25, 6.2], fov: 36 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.7} />
        <pointLight position={[3, 4, 4]} intensity={3.2} color="#63f7ff" />
        <pointLight position={[-4, -2, 3]} intensity={1.4} color="#ad78ff" />
        <CoreSystem />
      </Canvas>
    </div>
  );
}
