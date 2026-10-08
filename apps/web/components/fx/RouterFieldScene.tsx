'use client';

import { useEffect, useMemo, useRef } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Line, LineDashedMaterial, Vector3, type Points, type ShaderMaterial } from 'three';

import { MAX_DPR } from '@/lib/motion/capabilities';

import { FIELD_FRAGMENT, FIELD_VERTEX } from '@/components/fx/shaders/field';

interface FieldProps {
  count: number;
  activity: number;
}

const mouse = { x: 0, y: 0 };

function FieldPoints({ count, activity }: FieldProps) {
  const points = useRef<Points | null>(null);
  const material = useRef<ShaderMaterial | null>(null);
  const { viewport } = useThree();

  const { positions, seeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sd = new Float32Array(count);
    const cols = Math.ceil(Math.sqrt(count * 1.6));
    const rows = Math.ceil(count / cols);
    const w = 28;
    const h = 18;
    for (let i = 0; i < count; i += 1) {
      const cx = i % cols;
      const cy = Math.floor(i / cols);
      pos[i * 3] = (cx / cols - 0.5) * w + (Math.random() - 0.5) * 0.6;
      pos[i * 3 + 1] = (cy / rows - 0.5) * h + (Math.random() - 0.5) * 0.6;
      pos[i * 3 + 2] = 0;
      sd[i] = Math.random() * 100;
    }
    return { positions: pos, seeds: sd };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uActivity: { value: 0 },
      uMouse: { value: [0, 0] as [number, number] },
      uPixelRatio: { value: 1 },
      uColorA: { value: new Color('#7c5cff') },
      uColorB: { value: new Color('#19e6c1') },
      uColorC: { value: new Color('#5cc8ff') },
    }),
    [],
  );

  useFrame((state, delta) => {
    const m = material.current;
    if (!m) return;
    const u = m.uniforms;
    if (u.uTime) u.uTime.value += delta;
    if (u.uActivity) u.uActivity.value += (activity - (u.uActivity.value as number)) * Math.min(1, delta * 3);
    if (u.uMouse) {
      const target: [number, number] = [mouse.x * viewport.width * 0.5, mouse.y * viewport.height * 0.5];
      const cur = u.uMouse.value as [number, number];
      cur[0] += (target[0] - cur[0]) * Math.min(1, delta * 4);
      cur[1] += (target[1] - cur[1]) * Math.min(1, delta * 4);
    }
    if (u.uPixelRatio) u.uPixelRatio.value = state.gl.getPixelRatio();
  });

  return (
    <points ref={points} rotation={[-0.55, 0, 0]} position={[0, -2.5, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={FIELD_VERTEX}
        fragmentShader={FIELD_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

function Lanes({ activity }: { activity: number }) {
  const lines = useMemo(() => {
    const out: Line[] = [];
    for (let i = 0; i < 6; i += 1) {
      const pts: Vector3[] = [];
      const y = -6 + i * 2.4;
      for (let x = -16; x <= 16; x += 0.5) {
        pts.push(new Vector3(x, y + Math.sin(x * 0.35 + i) * 0.8, Math.cos(x * 0.2 + i * 0.7) * 0.4));
      }
      const geo = new BufferGeometry().setFromPoints(pts);
      const mat = new LineDashedMaterial({
        color: i % 2 === 0 ? '#7c5cff' : '#19e6c1',
        dashSize: 0.9,
        gapSize: 1.6,
        transparent: true,
        opacity: 0.22,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const line = new Line(geo, mat);
      line.computeLineDistances();
      line.rotation.x = -0.55;
      line.position.y = -2.5;
      out.push(line);
    }
    return out;
  }, []);

  useFrame((_, delta) => {
    for (const l of lines) {
      const m = l.material as LineDashedMaterial;
      m.dashOffset -= delta * (0.6 + activity * 2.4);
      m.opacity = 0.18 + activity * 0.35;
    }
  });

  useEffect(
    () => () => {
      for (const l of lines) {
        l.geometry.dispose();
        (l.material as LineDashedMaterial).dispose();
      }
    },
    [lines],
  );

  return (
    <>
      {lines.map((l, i) => (
        <primitive key={String(i)} object={l} />
      ))}
    </>
  );
}

export interface RouterFieldSceneProps {
  count: number;
  activity: number;
  paused: boolean;
}

export default function RouterFieldScene({ count, activity, paused }: RouterFieldSceneProps) {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <Canvas
      dpr={[1, MAX_DPR]}
      frameloop={paused ? 'never' : 'always'}
      camera={{ position: [0, 2, 14], fov: 50 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      className="!pointer-events-none"
    >
      <FieldPoints count={count} activity={activity} />
      <Lanes activity={activity} />
    </Canvas>
  );
}
