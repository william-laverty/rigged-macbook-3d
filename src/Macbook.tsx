import { forwardRef, useContext, useEffect, useRef } from 'react';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { DEFAULT_MODEL_URL, LID, SEAT, FIT_SIZE } from './constants';
import { clamp01 } from './math';
import { useScreenTexture } from './useScreenTexture';
import { StageActiveContext } from './MacbookStage';
import type { ScreenInput } from './types';

/** Per-frame state a `frameDriver` may return; fields override the matching props. */
export interface MacbookFrameState {
  open?: number;
  brightness?: number;
}

export type MacbookProps = ThreeElements['group'] & {
  /** Lid amount: 0 = closed, 1 = fully open. Linear — apply your own easing. Default 1. */
  open?: number;
  /** Screen content: a video URL, image URL, or ready THREE.Texture. */
  screen?: ScreenInput;
  /** Screen wake: 0 = black, 1 = full. Default 1. */
  brightness?: number;
  /** Auto play/pause the screen video so it only decodes while visible (paused while the lid is shut). Default true. */
  autoPlay?: boolean;
  /**
   * Self-hosting escape hatch. Must be THIS package's `assets/macbook-rigged.glb`
   * (copy it from node_modules) — the rig is welded to that file; other models throw.
   */
  modelSrc?: string;
  /** Called once the model is rigged and ready. The screen texture may still be loading at this point. */
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
  screenMat: THREE.MeshBasicMaterial;
  offset: [number, number, number];
  scale: number;
  seat: { hingeY: number; hingeZ: number; relY: number; relZ: number; targetY: number; openX: number; closedX: number };
}

/**
 * Clones the loaded model and wires the hinge pivot, screen material and fit
 * transform onto the clone. `useGLTF` hands every caller the same cached scene,
 * but an Object3D can only live under one parent — two <Macbook>s sharing a
 * modelSrc would tug it back and forth and leave one of them empty. Geometries
 * and materials stay shared, and the rig is a plain transform pivot (no skins),
 * so a deep clone has nothing to rebind.
 */
function rigModel(source: THREE.Object3D): { scene: THREE.Object3D; rig: Rig } {
  const scene = source.clone(true);

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

  const screenMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  screenMesh.material = screenMat;

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

  return {
    scene,
    rig: { pivot, screenMat, offset: [-c.x, -c.y, -c.z], scale: FIT_SIZE / maxDim, seat },
  };
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
    brightness = 1,
    autoPlay = true,
    modelSrc,
    onLoad,
    frameDriver,
    ...groupProps
  },
  ref,
) {
  const url = modelSrc ?? DEFAULT_MODEL_URL;
  const { scene: sourceScene } = useGLTF(url);
  // Lazy per-instance init, deliberately not useMemo: StrictMode double-invokes
  // memo factories and discards one result, and rigModel is not idempotent —
  // every call mints a fresh clone and a fresh screen material. Committing one
  // call's rig alongside another call's scene leaves the frame loop driving
  // a material that is not on the mounted mesh (a permanently black screen).
  const built = useRef<{ source: THREE.Object3D; value: ReturnType<typeof rigModel> } | null>(null);
  if (built.current?.source !== sourceScene) {
    built.current = { source: sourceScene, value: rigModel(sourceScene) };
  }
  const { scene, rig } = built.current.value;

  const { textureRef, ready, setPlaying } = useScreenTexture(screen);

  useEffect(() => {
    onLoad?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig]);

  // When the host stage parks its frameloop (offscreen), this component's own
  // useFrame below stops running — but a screen video that was mid-decode
  // would otherwise keep decoding forever. Pause it; resume happens naturally
  // through useFrame's setPlaying once the stage wakes and frames resume.
  const stageActive = useContext(StageActiveContext);
  useEffect(() => {
    if (!stageActive) setPlaying(false);
  }, [stageActive, setPlaying]);

  // Dispose the per-instance screen material on unmount — geometry and the
  // texture are shared/owned elsewhere, but screenMat is minted fresh per
  // <Macbook> instance in rigModel() and belongs to this instance alone.
  useEffect(() => {
    const { screenMat } = rig;
    return () => {
      screenMat.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig]);

  // Latest props, readable from the frame loop without re-subscribing.
  const propsRef = useRef({ open, brightness, autoPlay });
  propsRef.current = { open, brightness, autoPlay };

  useFrame(() => {
    const p = propsRef.current;
    const d = frameDriver?.() ?? {};
    const openNow = clamp01(d.open ?? p.open);
    const brightNow = clamp01(d.brightness ?? p.brightness);

    // Lid hinge + dynamic seat lift: hold the screen's bottom edge at targetY
    // whenever the bare rotation would drop it lower (no keyboard clipping).
    const { pivot, screenMat, seat } = rig;
    pivot.rotation.x = seat.closedX + (seat.openX - seat.closedX) * openNow;
    const theta = pivot.rotation.x;
    const screenBottomY = seat.hingeY + seat.relY * Math.cos(theta) - seat.relZ * Math.sin(theta);
    const lift = Math.max(0, seat.targetY - screenBottomY);
    pivot.position.y = seat.hingeY + lift;

    screenMat.color.setScalar(brightNow);

    const texture = textureRef.current;
    if (ready && texture) {
      // Swapping .map (incl. null→texture) toggles the USE_MAP shader define —
      // flag a recompile or the screen renders flat white.
      if (screenMat.map !== texture) {
        screenMat.map = texture;
        screenMat.needsUpdate = true;
      }
      // Nothing decodes while the lid is (nearly) shut or the screen is dark.
      if (p.autoPlay) setPlaying(openNow > 0.01 && brightNow > 0);
    }
  });

  return (
    <group ref={ref} {...groupProps}>
      <group scale={rig.scale}>
        <primitive object={scene} position={rig.offset} />
      </group>
    </group>
  );
});
