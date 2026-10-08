'use client';

import { useRef } from 'react';

import { MeshTransmissionMaterial } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';

import { MAX_DPR } from '@/lib/motion/capabilities';

interface OrbProps {
  activity: number;
  pulseKey: number;
}

function Orb({ activity, pulseKey }: OrbProps) {
  const group = useRef<Group | null>(null);
  const core = useRef<Mesh | null>(null);
  const lastPulse = useRef(pulseKey);
  const pulseT = useRef(0);

  useFrame((state, delta) => {
    const g = group.current;
    const c = core.current;
    if (!g || !c) return;
    const t = state.clock.elapsedTime;
    g.rotation.y += delta * (0.25 + activity * 0.9);
    g.rotation.x = Math.sin(t * 0.3) * 0.15;
    if (lastPulse.current !== pulseKey) {
      lastPulse.current = pulseKey;
      pulseT.current = 1;
    }
    pulseT.current = Math.max(0, pulseT.current - delta * 2.2);
    const breathe = 1 + Math.sin(t * (1.2 + activity * 3)) * (0.03 + activity * 0.05);
    const s = breathe + pulseT.current * 0.12;
    g.scale.setScalar(s);
    c.scale.setScalar(0.55 + activity * 0.15 + pulseT.current * 0.1);
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1, 4]} />
        <MeshTransmissionMaterial
          samples={4}
          thickness={0.9}
          roughness={0.12}
          chromaticAberration={0.25}
          anisotropicBlur={0.4}
          distortion={0.35}
          distortionScale={0.4}
          temporalDistortion={0.15}
          color="#9b8cff"
          attenuationColor="#19e6c1"
          attenuationDistance={1.2}
        />
      </mesh>
      <mesh ref={core}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color="#7c5cff" emissive="#7c5cff" emissiveIntensity={1.6 + activity * 2} toneMapped={false} />
      </mesh>
      <mesh scale={0.3}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#19e6c1" toneMapped={false} />
      </mesh>
    </group>
  );
}

export interface RouterOrbSceneProps extends OrbProps {
  paused: boolean;
}

export default function RouterOrbScene({ activity, pulseKey, paused }: RouterOrbSceneProps) {
  return (
    <Canvas
      dpr={[1, MAX_DPR]}
      frameloop={paused ? 'never' : 'always'}
      camera={{ position: [0, 0, 3.2], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      className="!pointer-events-none"
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 3, 3]} intensity={6} color="#19e6c1" />
      <pointLight position={[-3, -2, 2]} intensity={5} color="#7c5cff" />
      <Orb activity={activity} pulseKey={pulseKey} />
    </Canvas>
  );
}
