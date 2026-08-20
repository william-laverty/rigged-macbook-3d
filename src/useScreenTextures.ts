import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ScreenInput, ScreenSource } from './types';

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

interface Normalised {
  kind: 'video' | 'image' | 'texture';
  src?: string;
  fallbackSrc?: string;
  texture?: THREE.Texture;
}

function normalise(input: ScreenInput): Normalised {
  if (input instanceof THREE.Texture) return { kind: 'texture', texture: input };
  const s: ScreenSource = typeof input === 'string' ? { src: input } : input;
  const kind = s.type ?? (VIDEO_EXT.test(s.src) ? 'video' : 'image');
  return { kind, src: s.src, fallbackSrc: s.fallbackSrc };
}

/**
 * Turns screen inputs (video URLs, image URLs, or ready textures) into an
 * index-aligned list of THREE.Textures. Videos are muted, looping, detached
 * <video> elements driven imperatively — call `setPlaying` with the indices
 * that should decode (typically just the visible one or two); the rest pause.
 * Note: `ScreenSource.fallbackSrc` only applies to video sources.
 */
export function useScreenTextures(sources: ScreenInput[]) {
  const texturesRef = useRef<(THREE.Texture | null)[]>([]);
  const videosRef = useRef<(HTMLVideoElement | null)[]>([]);
  const [ready, setReady] = useState(false);

  // Key the effect on the source identities, not the array reference, so
  // consumers can pass inline arrays without re-creating every texture.
  const key = sources
    .map((s) => (s instanceof THREE.Texture ? `tex:${s.uuid}` : typeof s === 'string' ? s : `${s.src}|${s.fallbackSrc ?? ''}`))
    .join('¦');

  useEffect(() => {
    const norm = sources.map(normalise);
    const owned: THREE.Texture[] = []; // textures WE created (disposed on cleanup)
    const videos: (HTMLVideoElement | null)[] = norm.map(() => null);

    const textures = norm.map((n, i) => {
      if (n.kind === 'texture') return n.texture!;
      if (n.kind === 'image') {
        const t = new THREE.TextureLoader().load(n.src!);
        t.colorSpace = THREE.SRGBColorSpace;
        owned.push(t);
        return t;
      }
      const v = document.createElement('video');
      v.src = n.src!;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      // Only the first entry buffers ahead (it must never be a black panel);
      // the rest fetch on their first play().
      v.preload = i === 0 ? 'auto' : 'metadata';
      v.crossOrigin = 'anonymous';
      if (n.fallbackSrc) {
        v.addEventListener('error', () => {
          if (!v.src.endsWith(n.fallbackSrc!)) {
            v.src = n.fallbackSrc!;
            v.load();
          }
        });
      }
      v.load();
      videos[i] = v;
      const t = new THREE.VideoTexture(v);
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      owned.push(t);
      return t;
    });

    texturesRef.current = textures;
    videosRef.current = videos;
    setReady(true);

    return () => {
      owned.forEach((t) => t.dispose());
      videos.forEach((v) => {
        if (!v) return;
        v.pause();
        v.removeAttribute('src');
        v.load();
      });
      texturesRef.current = [];
      videosRef.current = [];
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** Play exactly the given indices' videos; pause the rest. Frame-loop safe. */
  const setPlaying = useCallback((indices: Set<number>) => {
    videosRef.current.forEach((v, i) => {
      if (!v) return;
      if (indices.has(i)) {
        if (v.paused) v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, []);

  /** Pause every video (e.g. section off-screen). */
  const pauseAll = useCallback(() => {
    videosRef.current.forEach((v) => {
      if (v && !v.paused) v.pause();
    });
  }, []);

  return { texturesRef, ready, setPlaying, pauseAll };
}
