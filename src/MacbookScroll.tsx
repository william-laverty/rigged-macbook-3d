import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Macbook, type MacbookFrameState } from './Macbook';
import { MacbookStage } from './MacbookStage';
import { useCapabilityGate } from './useCapabilityGate';
import { journeyState, speedCapAt } from './journey';
import { resolveTimeline, resolvePoses, resolveFeel, type PosesPartial } from './constants';
import { clamp01, smoothDamp } from './math';
import type { ScreenSource, Timeline, Feel, LightingPreset } from './types';

export interface MacbookScrollHandle {
  /** Smooth-scroll the page so the journey lands on screen `index`. */
  scrollToScreen(index: number): void;
  /** Current smoothed journey progress, 0–1. */
  readonly progress: number;
}

export interface MacbookScrollProps {
  /** The screen walkthrough content, in order. */
  screens: (string | ScreenSource)[];
  /** Total scroll length of the pinned journey. Default '600vh'. */
  height?: string;
  /** Lighting preset. Default 'studio-dark'. */
  lighting?: LightingPreset;
  /** Override any journey beats; unspecified beats keep the tuned defaults. */
  timeline?: Partial<Timeline>;
  /** Override any pose values; unspecified values keep the tuned defaults. */
  poses?: PosesPartial;
  /** Override the scroll feel; unspecified values keep the tuned defaults. */
  feel?: Partial<Feel>;
  /** Cursor-follow tilt once dived in. Default true. */
  pointerParallax?: boolean;
  /** Rendered INSTEAD of the journey when the client lacks WebGL2 or prefers reduced motion. */
  fallback?: ReactNode;
  className?: string;
  /** Self-hosting escape hatch — see <Macbook modelSrc>. */
  modelSrc?: string;
  /** Fires with the smoothed progress whenever it changes. */
  onProgress?: (p: number) => void;
  /** Fires when the dominant screen changes — drive tab bars/captions from this. */
  onActiveScreen?: (index: number) => void;
  /** Overlay content rendered inside the sticky viewport, above the canvas. */
  children?: ReactNode;
}

/** Inner R3F component: drives pose + parallax per frame from the shared refs. */
function ScrollRig({
  groupRef, progressRef, pointerRef, timeline, poses, feel, count, pointerParallax,
}: {
  groupRef: React.MutableRefObject<THREE.Group | null>;
  progressRef: React.MutableRefObject<number>;
  pointerRef: React.MutableRefObject<{ x: number; y: number; active: boolean }>;
  timeline: Timeline;
  poses: ReturnType<typeof resolvePoses>;
  feel: Feel;
  count: number;
  pointerParallax: boolean;
}) {
  const tilt = useRef({ x: 0, y: 0 });
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const p = progressRef.current;
    const s = journeyState(p, timeline, poses, count, feel.crossfadeFraction);

    // Parallax fades in with the dive; the device never moves unless the user does.
    const diveT = (s.pose.scale - poses.intro.scale) / (poses.dive.scale - poses.intro.scale || 1);
    const influence = pointerParallax ? clamp01(diveT) : 0;
    const ptr = pointerRef.current;
    const wantY = ptr.active ? ptr.x * 0.14 * influence : 0;
    const wantX = ptr.active ? ptr.y * 0.09 * influence : 0;
    tilt.current.y += (wantY - tilt.current.y) * 0.08;
    tilt.current.x += (wantX - tilt.current.x) * 0.08;

    g.scale.setScalar(s.pose.scale);
    g.rotation.y = s.pose.yaw + tilt.current.y;
    g.rotation.x = s.pose.pitch + tilt.current.x;
    g.position.x = s.pose.x;
    g.position.y = s.pose.y;
  });
  return null;
}

/**
 * The full scroll journey (the NOX homepage effect) with zero scroll-library
 * dependencies: a tall wrapper pins a sticky viewport; scroll maps to a target
 * progress; a critically-damped follow (with per-phase speed caps) chases it,
 * so wheel steps become fluid motion and everything reverses exactly.
 */
export const MacbookScroll = forwardRef<MacbookScrollHandle, MacbookScrollProps>(function MacbookScroll(
  {
    screens,
    height = '600vh',
    lighting = 'studio-dark',
    timeline: timelineIn,
    poses: posesIn,
    feel: feelIn,
    pointerParallax = true,
    fallback = null,
    className,
    modelSrc,
    onProgress,
    onActiveScreen,
    children,
  },
  ref,
) {
  const capable = useCapabilityGate();
  const timeline = useMemo(() => resolveTimeline(timelineIn), [timelineIn]);
  const poses = useMemo(() => resolvePoses(posesIn), [posesIn]);
  const feel = useMemo(() => resolveFeel(feelIn), [feelIn]);
  const count = screens.length;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const groupRef = useRef<THREE.Group | null>(null);
  const [activeScreen, setActiveScreen] = useState(0);
  const activeRef = useRef(0);

  // Scroll → target; rAF chases it with the damped, speed-capped follow.
  useEffect(() => {
    if (!capable) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let target = 0;
    let raf = 0;
    let last = performance.now();
    const vel = { current: 0 };
    let renderedAt = NaN;

    const measure = () => {
      const rect = wrapper.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const len = wrapper.offsetHeight - window.innerHeight;
      target = len > 0 ? clamp01((window.scrollY - top) / len) : 0;
    };
    measure();
    // Prime at the current position (deep links land settled, not animating in).
    progressRef.current = target;

    const render = () => {
      const sp = progressRef.current;
      // deviceIn fade/rise is DOM-side (opacity + translate on the stage wrapper).
      const s = journeyState(sp, timeline, poses, count, feel.crossfadeFraction);
      const el = stageWrapRef.current;
      if (el) {
        el.style.opacity = String(s.deviceIn);
        el.style.transform = `translateY(${56 * (1 - s.deviceIn)}px)`;
      }
      if (s.screenIndex !== activeRef.current) {
        activeRef.current = s.screenIndex;
        setActiveScreen(s.screenIndex);
        onActiveScreen?.(s.screenIndex);
      }
      onProgress?.(sp);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      measure();
      const sp = progressRef.current;
      if (sp === target && vel.current === 0 && renderedAt === sp) return; // idle
      const cap = speedCapAt(sp, timeline, feel, count);
      let next = smoothDamp(sp, target, vel, feel.smoothTime, dt, cap);
      if (Math.abs(next - target) < 1e-4 && Math.abs(vel.current) < 2e-3) {
        next = target;
        vel.current = 0;
      }
      progressRef.current = next;
      render();
      renderedAt = next;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [capable, timeline, poses, feel, count, onProgress, onActiveScreen]);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapperRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    pointerRef.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointerRef.current.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    pointerRef.current.active = true;
  }, []);
  const onLeave = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scrollToScreen(index: number) {
        const wrapper = wrapperRef.current;
        if (!wrapper || count === 0) return;
        const rect = wrapper.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const len = wrapper.offsetHeight - window.innerHeight;
        const [s0, s1] = timeline.screens;
        const p = s0 + ((index + 0.5) / count) * (s1 - s0);
        window.scrollTo({ top: top + p * len, behavior: 'smooth' });
      },
      get progress() {
        return progressRef.current;
      },
    }),
    [count, timeline],
  );

  const frameDriver = useCallback((): MacbookFrameState => {
    const s = journeyState(progressRef.current, timeline, poses, count, feel.crossfadeFraction);
    return { open: s.open, brightness: s.brightness, screenIndex: s.screenIndex, screenMix: s.screenMix };
  }, [timeline, poses, count, feel.crossfadeFraction]);

  if (capable === null) return <div className={className} style={{ height }} />;
  if (!capable) return <div className={className}>{fallback}</div>;

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ position: 'relative', height }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      data-active-screen={activeScreen}
    >
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        <div ref={stageWrapRef} style={{ position: 'absolute', inset: 0, opacity: 0 }}>
          <MacbookStage lighting={lighting}>
            <group ref={groupRef}>
              <Macbook screens={screens} frameDriver={frameDriver} modelSrc={modelSrc} />
            </group>
            <ScrollRig
              groupRef={groupRef}
              progressRef={progressRef}
              pointerRef={pointerRef}
              timeline={timeline}
              poses={poses}
              feel={feel}
              count={count}
              pointerParallax={pointerParallax}
            />
          </MacbookStage>
        </div>
        {children}
      </div>
    </div>
  );
});
