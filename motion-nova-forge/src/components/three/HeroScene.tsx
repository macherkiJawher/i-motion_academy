import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, MeshDistortMaterial, Points, PointMaterial, Torus } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import { MathUtils } from "three";

function ParticleField() {
  const ref = useRef<any>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(1800 * 3);
    for (let i = 0; i < 1800; i++) {
      const r = 3 + Math.random() * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.03;
      ref.current.rotation.x += dt * 0.008;
    }
  });

  return (
    <group ref={ref}>
      <Points positions={positions} stride={3}>
        <PointMaterial transparent color="#3AEFFF" size={0.028} sizeAttenuation depthWrite={false} opacity={0.75} />
      </Points>
    </group>
  );
}

function EnergyRings() {
  const g = useRef<Group>(null);
  useFrame((state) => {
    if (!g.current) return;
    const t = state.clock.elapsedTime;
    g.current.rotation.x = Math.sin(t * 0.25) * 0.4;
    g.current.rotation.y += 0.0035;
  });
  return (
    <group ref={g}>
      {[2.4, 3.1, 3.8].map((r, i) => (
        <Torus key={r} args={[r, 0.006, 12, 160]} rotation={[Math.PI / 2 + i * 0.35, i * 0.4, 0]}>
          <meshBasicMaterial color={i === 1 ? "#7A5CFF" : "#00D1FF"} transparent opacity={0.55} />
        </Torus>
      ))}
    </group>
  );
}

function Core() {
  const mesh = useRef<Mesh>(null);
  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    mesh.current.rotation.y = t * 0.18;
    mesh.current.rotation.z = Math.sin(t * 0.3) * 0.15;
  });
  return (
    <Float speed={1.2} rotationIntensity={0.5} floatIntensity={1.1}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.5, 6]} />
        <MeshDistortMaterial
          color="#0B0B0F"
          emissive="#00D1FF"
          emissiveIntensity={0.35}
          roughness={0.12}
          metalness={0.95}
          distort={0.32}
          speed={1.4}
        />
      </mesh>
    </Float>
  );
}

function Satellites() {
  const g = useRef<Group>(null);
  useFrame((state) => {
    if (g.current) g.current.rotation.y = -state.clock.elapsedTime * 0.12;
  });
  const items = useMemo(
    () => [
      { p: [2.7, 0.9, -0.6], c: "#1EF7A5", s: 0.22 },
      { p: [-2.9, -0.7, 0.8], c: "#7A5CFF", s: 0.3 },
      { p: [1.4, -1.8, 1.6], c: "#00FFF5", s: 0.18 },
      { p: [-1.8, 1.9, -1.4], c: "#00D1FF", s: 0.25 },
    ],
    [],
  );
  return (
    <group ref={g}>
      {items.map((it, i) => (
        <Float key={i} speed={1.6} floatIntensity={2} rotationIntensity={1.4}>
          <mesh position={it.p as [number, number, number]}>
            <octahedronGeometry args={[it.s, 0]} />
            <meshStandardMaterial color={it.c} emissive={it.c} emissiveIntensity={0.9} roughness={0.2} metalness={0.6} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function CameraRig() {
  const { camera, pointer } = useThree();
  useFrame(() => {
    camera.position.x = MathUtils.lerp(camera.position.x, pointer.x * 1.6, 0.04);
    camera.position.y = MathUtils.lerp(camera.position.y, pointer.y * 1.0, 0.04);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 45 }}
      dpr={[1, 1.7]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[6, 4, 6]} intensity={70} color="#00D1FF" />
      <pointLight position={[-6, -3, 4]} intensity={55} color="#7A5CFF" />
      <pointLight position={[0, 5, -6]} intensity={35} color="#1EF7A5" />
      <Core />
      <EnergyRings />
      <Satellites />
      <ParticleField />
      <Environment preset="city" />
      <CameraRig />
    </Canvas>
  );
}
