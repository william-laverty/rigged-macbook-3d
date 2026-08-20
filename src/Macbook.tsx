import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { DEFAULT_MODEL_URL, LID, SEAT, FIT_SIZE } from './constants';
import { clamp01 } from './math';
import { useScreenTextures } from './useScreenTextures';
import type { ScreenInput } from './types';

/** Per-frame state a `frameDriver` may return; fields override the matching props. */
export interface MacbookFrameState {
  open?: number;
  brightness?: number;
  screenIndex?: number;
  screenMix?: number;
}

export type MacbookProps = ThreeElements['group'] & {
  /** Lid amount: 0 = closed, 1 = fully open. Linear — apply your own easing. Default 1. */
  open?: number;
  /** Single screen content (sugar for `screens={[screen]}`). */
  screen?: ScreenInput;
  /** Screen playlist; crossfade between entries with screenIndex/screenMix. */
  screens?: ScreenInput[];
  /** Active playlist entry. Default 0. */
  screenIndex?: number;
  /** 0–1 crossfade from screenIndex toward screenIndex + 1. Raw — apply your own easing. Default 0. */
  screenMix?: number;
  /** Screen wake: 0 = black, 1 = full. Default 1. */
  brightness?: number;
  /** Auto play/pause videos so only visible entries decode (paused while the lid is shut). Default true. */
  autoPlayScreens?: boolean;
  /**
   * Self-hosting escape hatch. Must be THIS package's `assets/macbook-rigged.glb`
   * (copy it from node_modules) — the rig is welded to that file; other models throw.
   */
  modelSrc?: string;
  /** Called once the model is rigged and ready. */
  onLoad?: () => void;
  /**
   * Advanced: per-frame state source, called inside the render loop. Returned
   * fields override the matching props each frame — drive `open` etc. from
   * scroll positions or MotionValues without re-rendering React.
   */
  frameDriver?: () => MacbookFrameState;
};

interface Rig {
  pivot: THREE.Object3D;
  baseMat: THREE.MeshBasicMaterial;
  overMat: THREE.MeshBasicMaterial;
  offset: [number, number, number];
  scale: number;
  seat: { hingeY: number; hingeZ: number; relY: number; relZ: number; targetY: number; openX: number; closedX: number };
}

/**
 * The rigged 3D MacBook. Headless and controlled: renders exactly the state
 * its props (or `frameDriver`) describe, inside any @react-three/fiber canvas.
 * Model: "MacBook Pro M3 16-inch 2024" by jackbaeten (CC-BY 4.0), pre-rigged —
 * see CREDITS.md.
 */
export const Macbook = forwardRef<THREE.Group, MacbookProps>(function Macbook(
  {
    open = 1,
    screen,
    screens,
    screenIndex = 0,
    screenMix = 0,
    brightness = 1,
    autoPlayScreens = true,
    modelSrc,
    onLoad,
    frameDriver,
    ...groupProps
  },
  ref,
) {
  const url = modelSrc ?? DEFAULT_MODEL_URL;
  const { scene } = useGLTF(url);
  const sources = useMemo<ScreenInput[]>(
    () => screens ?? (screen !== undefined ? [screen] : []),
    [screens, screen],
  );
  const { texturesRef, ready, setPlaying, pauseAll } = useScreenTextures(sources);

  const rig = useMemo<Rig>(() => {
    const cached = scene.userData.__riggedMacbook as Rig | undefined;
    if (cached) return cached;

    const pivot = scene.getObjectByName('LidPivot');
    if (!pivot) {
      throw new Error(
        'rigged-macbook-3d: node "LidPivot" not found in the model. Only this package\'s ' +
          'assets/macbook-rigged.glb works (the rig is welded to it). If you passed modelSrc, ' +
          'copy the file from node_modules/rigged-macbook-3d/assets/macbook-rigged.glb.',
      );
    }
    const screenMesh = scene.getObjectByName('Screen') as THREE.Mesh | undefined;
    if (!screenMesh?.isMesh) {
      throw new Error(
        'rigged-macbook-3d: mesh "Screen" not found in the model — screen content cannot display. ' +
          'Use this package\'s assets/macbook-rigged.glb.',
      );
    }

    const baseMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
    const overMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    screenMesh.material = baseMat;
    const overlay = new THREE.Mesh(screenMesh.geometry, overMat);
    overlay.renderOrder = 2;
    screenMesh.add(overlay);

    // envMapIntensity is a three.js-only property glTF can't carry — the bake
    // tags the recoloured Space-Black materials; finish them here.
    const seen = new Set<THREE.Material>();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
        if (!m || seen.has(m)) return;
        seen.add(m);
        if (m.userData?.spaceBlack && 'envMapIntensity' in m) {
          (m as THREE.MeshStandardMaterial).envMapIntensity = 0.85;
        }
      });
    });

    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    // Rig constants: prefer the values the bake embedded in the pivot's extras.
    const e = pivot.userData as Record<string, number>;
    const hingeY = pivot.position.y; // authored pivot position = hinge axis
    const hingeZ = pivot.position.z;
    const seat = {
      hingeY,
      hingeZ,
      relY: (e.screenBottomY ?? SEAT.SCREEN_BOTTOM_Y) - hingeY,
      relZ: (e.screenBottomZ ?? SEAT.SCREEN_BOTTOM_Z) - hingeZ,
      targetY: e.seatTargetY ?? SEAT.TARGET_Y,
      openX: e.lidOpenX ?? LID.OPEN_X,
      closedX: e.lidClosedX ?? LID.CLOSED_X,
    };

    const result: Rig = {
      pivot,
      baseMat,
      overMat,
      offset: [-c.x, -c.y, -c.z],
      scale: FIT_SIZE / maxDim,
      seat,
    };
    scene.userData.__riggedMacbook = result;
    return result;
  }, [scene]);

  useEffect(() => {
    onLoad?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig]);

  // Latest props, readable from the frame loop without re-subscribing.
  const propsRef = useRef({ open, brightness, screenIndex, screenMix, autoPlayScreens });
  propsRef.current = { open, brightness, screenIndex, screenMix, autoPlayScreens };

  const playing = useRef<Set<number>>(new Set());

  useFrame(() => {
    const p = propsRef.current;
    const d = frameDriver?.() ?? {};
    const openNow = clamp01(d.open ?? p.open);
    const brightNow = clamp01(d.brightness ?? p.brightness);
    const idx = d.screenIndex ?? p.screenIndex;
    const mix = clamp01(d.screenMix ?? p.screenMix);

    // Lid hinge + dynamic seat lift: hold the screen's bottom edge at targetY
    // whenever the bare rotation would drop it lower (no keyboard clipping).
    const { pivot, baseMat, overMat, seat } = rig;
    pivot.rotation.x = seat.closedX + (seat.openX - seat.closedX) * openNow;
    const theta = pivot.rotation.x;
    const screenBottomY = seat.hingeY + seat.relY * Math.cos(theta) - seat.relZ * Math.sin(theta);
    const lift = Math.max(0, seat.targetY - screenBottomY);
    pivot.position.y = seat.hingeY + lift;

    baseMat.color.setScalar(brightNow);

    const textures = texturesRef.current;
    if (ready && textures.length > 0) {
      const i = Math.min(Math.max(0, idx), textures.length - 1);
      const nextI = Math.min(i + 1, textures.length - 1);
      // Swapping .map (incl. null→texture) toggles the USE_MAP shader define —
      // flag a recompile or the screen renders flat white.
      if (baseMat.map !== textures[i]) {
        baseMat.map = textures[i];
        baseMat.needsUpdate = true;
      }
      if (overMat.map !== textures[nextI]) {
        overMat.map = textures[nextI];
        overMat.needsUpdate = true;
      }
      overMat.opacity = nextI !== i ? mix : 0;

      if (p.autoPlayScreens) {
        const want = playing.current;
        want.clear();
        // Nothing decodes while the lid is (nearly) shut or the screen is dark.
        if (openNow > 0.01 && brightNow > 0) {
          want.add(i);
          if (mix > 0 && nextI !== i) want.add(nextI);
        }
        setPlaying(want);
      }
    }
  });

  useEffect(() => () => pauseAll(), [pauseAll]);

  return (
    <group ref={ref} {...groupProps}>
      <group scale={rig.scale}>
        <primitive object={scene} position={rig.offset} />
      </group>
    </group>
  );
});
