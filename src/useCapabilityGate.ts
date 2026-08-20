import { useEffect, useState } from 'react';

// three r163+ requires WebGL2 — probe it specifically.
function detectWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * Whether this client should get the 3D experience: WebGL2 available and
 * `prefers-reduced-motion` not set. Returns `null` on the first render
 * (SSR-safe), then a boolean. Re-evaluates live but only ever DOWNGRADES —
 * remounting a 3D scene under the user is its own kind of motion.
 */
export function useCapabilityGate(): boolean | null {
  const [capable, setCapable] = useState<boolean | null>(null);

  useEffect(() => {
    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ok = detectWebGL2() && !reduceMq.matches;
    setCapable(ok);
    const onChange = () => {
      if (reduceMq.matches) setCapable(false);
    };
    // Safari <14 only has the older addListener/removeListener pair.
    if (typeof reduceMq.addEventListener === 'function') {
      reduceMq.addEventListener('change', onChange);
      return () => reduceMq.removeEventListener('change', onChange);
    }
    reduceMq.addListener(onChange);
    return () => reduceMq.removeListener(onChange);
  }, []);

  return capable;
}
