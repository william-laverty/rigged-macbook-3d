import { createContext, useEffect, useRef, useState, type CSSProperties, type FC, type ReactNode } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import * as THREE from 'three';
import { MacbookLighting } from './MacbookLighting';
import type { LightingPreset } from './types';

/**
 * Whether the stage is "active" (rendering frames). When `pauseWhenOffscreen`
 * parks the Canvas's frameloop, `<Macbook>`'s useFrame stops running — but any
 * screen video it was playing keeps decoding forever unless it's told to
 * pause. Internal — not part of the public API.
 */
export const StageActiveContext = createContext(true);

export interface MacbookStageProps extends Omit<CanvasProps, 'children'> {
  /** Lighting preset for the stage. Default "studio-dark". */
  lighting?: LightingPreset;
  /** Scales the preset's lights. Default 1. */
  lightingIntensity?: number;
  /** Park the frameloop (and GPU) while the stage is off-screen. Default true. */
  pauseWhenOffscreen?: boolean;
  /** Wrapper div class/style — size the stage with these (defaults to 100%/100%). */
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * A ready-to-go stage: wrapper div + <Canvas> with the tuned camera (z 6, fov 32),
 * ACES filmic tone mapping, and a lighting preset. Drop a <Macbook> inside.
 * For existing R3F apps, skip this and use <Macbook> + <MacbookLighting> directly.
 */
export const MacbookStage: FC<MacbookStageProps> = ({
  lighting = 'studio-dark',
  lightingIntensity = 1,
  pauseWhenOffscreen = true,
  className,
  style,
  children,
  ...canvasProps
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    if (!pauseWhenOffscreen) return;
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? true),
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pauseWhenOffscreen]);

  return (
    <div ref={wrapRef} className={className} style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        frameloop={pauseWhenOffscreen ? (inView ? 'always' : 'never') : 'always'}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
        style={{ position: 'absolute', inset: 0 }}
        {...canvasProps}
      >
        <MacbookLighting preset={lighting} intensity={lightingIntensity} />
        <StageActiveContext.Provider value={pauseWhenOffscreen ? inView : true}>
          {children}
        </StageActiveContext.Provider>
      </Canvas>
    </div>
  );
};
