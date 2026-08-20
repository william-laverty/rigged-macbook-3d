import type { FC, ReactNode } from 'react';
import { Environment, Lightformer } from '@react-three/drei';
import type { LightingPreset } from './types';

export interface MacbookLightingProps {
  /** Built-in rig to use. Default "studio-dark" — the tuned Space-Black look. */
  preset?: LightingPreset;
  /** Scales every light in the preset. Default 1. */
  intensity?: number;
  /** Escape hatch: children REPLACE the preset entirely (bring your own lights). */
  children?: ReactNode;
}

/**
 * Lighting rigs tuned for the Space-Black MacBook. "studio-dark" keeps the body
 * moody and lets a few crisp bright reflections carry it — the dark-body /
 * bright-streak contrast is what reads as anodised metal rather than lit plastic.
 */
export const MacbookLighting: FC<MacbookLightingProps> = ({ preset = 'studio-dark', intensity = 1, children }) => {
  if (children) return <>{children}</>;
  const k = intensity;

  if (preset === 'studio-dark') {
    return (
      <>
        <ambientLight intensity={0.1 * k} />
        {/* Soft warm key for gentle form on the matte parts (keyboard, bezel). */}
        <directionalLight position={[5, 8, 6]} intensity={1.15 * k} color="#ffeeda" />
        {/* Low cool fill — lifts the shadow side a touch without flattening. */}
        <directionalLight position={[-7, 3, 4]} intensity={0.18 * k} color="#c4d2ff" />
        {/* Cool back-rim glints the top edge, separating chassis from page. */}
        <directionalLight position={[-2, 6, -7]} intensity={1.0 * k} color="#e6eeff" />
        {/* Dark studio: mostly-dark environment with a few bright bands the
            metal reflects as streaks over a dark body. */}
        <Environment resolution={512} frames={1}>
          <Lightformer form="rect" intensity={1.5 * k} position={[1, 3, 6]} rotation={[-0.3, 0, 0]} scale={[8, 5, 1]} color="#ffe7d2" />
          <Lightformer form="rect" intensity={2.6 * k} position={[0, 6, -3]} rotation={[Math.PI / 2.2, 0, 0]} scale={[14, 1.6, 1]} color="#dde7ff" />
          <Lightformer form="rect" intensity={2.2 * k} position={[-3.4, 1, 6.5]} scale={[1.3, 9, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={1.5 * k} position={[3.6, 0, 6.5]} scale={[1, 9, 1]} color="#e6edff" />
          <Lightformer form="rect" intensity={0.18 * k} position={[0, -1, 8]} scale={[18, 12, 1]} color="#9fb0e0" />
          <Lightformer intensity={0.9 * k} position={[8, 1, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[5, 7, 1]} color="#ffffff" />
          <Lightformer intensity={0.55 * k} position={[-8, 1, 2]} rotation={[0, Math.PI / 2, 0]} scale={[5, 7, 1]} color="#c4d2ff" />
        </Environment>
      </>
    );
  }

  if (preset === 'studio-light') {
    return (
      <>
        <ambientLight intensity={0.45 * k} />
        <directionalLight position={[5, 8, 6]} intensity={1.0 * k} color="#ffffff" />
        <directionalLight position={[-6, 4, 3]} intensity={0.35 * k} color="#eef2ff" />
        <Environment resolution={512} frames={1}>
          <Lightformer form="rect" intensity={2.0 * k} position={[0, 5, 5]} rotation={[-0.4, 0, 0]} scale={[12, 8, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={1.2 * k} position={[0, 0, 8]} scale={[20, 14, 1]} color="#f4f6ff" />
          <Lightformer form="rect" intensity={1.4 * k} position={[0, 6, -4]} rotation={[Math.PI / 2.2, 0, 0]} scale={[14, 2, 1]} color="#ffffff" />
          <Lightformer intensity={0.8 * k} position={[8, 1, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[5, 7, 1]} color="#ffffff" />
          <Lightformer intensity={0.8 * k} position={[-8, 1, 2]} rotation={[0, Math.PI / 2, 0]} scale={[5, 7, 1]} color="#ffffff" />
        </Environment>
      </>
    );
  }

  // "soft": gentle, even, minimal drama.
  return (
    <>
      <ambientLight intensity={0.7 * k} />
      <directionalLight position={[3, 6, 4]} intensity={0.6 * k} color="#ffffff" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.0 * k} position={[0, 4, 6]} rotation={[-0.3, 0, 0]} scale={[16, 10, 1]} color="#ffffff" />
      </Environment>
    </>
  );
};
