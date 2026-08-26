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
 * Turns screen input (a video URL, image URL, or ready texture) into a
 * THREE.Texture. A video becomes a muted, looping, detached <video> element
 * driven imperatively — call `setPlaying` to control whether it decodes.
 * Note: `ScreenSource.fallbackSrc` only applies to video sources.
 */
export function useScreenTexture(source?: ScreenInput) {
  const textureRef = useRef<THREE.Texture | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  // Key the effect on the source identity, not the value reference, so
  // consumers can pass inline objects without re-creating the texture.
  const key =
    source === undefined
      ? ''
      : source instanceof THREE.Texture
        ? `tex:${source.uuid}`
        : typeof source === 'string'
          ? source
          : `${source.src}|${source.fallbackSrc ?? ''}`;

  useEffect(() => {
    if (source === undefined) return;
    const n = normalise(source);
    let owned: THREE.Texture | null = null; // a texture WE created (disposed on cleanup)
    let video: HTMLVideoElement | null = null;

    if (n.kind === 'texture') {
      textureRef.current = n.texture!;
    } else if (n.kind === 'image') {
      const t = new THREE.TextureLoader().load(n.src!);
      t.colorSpace = THREE.SRGBColorSpace;
      owned = t;
      textureRef.current = t;
    } else {
      const v = document.createElement('video');
      v.src = n.src!;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      // Buffer ahead — the screen must never wake to a black panel.
      v.preload = 'auto';
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
      video = v;
      const t = new THREE.VideoTexture(v);
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      owned = t;
      textureRef.current = t;
    }
    videoRef.current = video;
    setReady(true);

    return () => {
      owned?.dispose();
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      textureRef.current = null;
      videoRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** Play or pause the video (no-op for images/textures). Frame-loop safe. */
  const setPlaying = useCallback((playing: boolean) => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      if (v.paused) v.play().catch(() => {});
    } else if (!v.paused) {
      v.pause();
    }
  }, []);

  return { textureRef, ready, setPlaying };
}
