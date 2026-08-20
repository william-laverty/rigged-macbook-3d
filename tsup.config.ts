import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Next.js App Router: mark the whole library as a client component.
  banner: { js: '"use client";' },
  define: { __PKG_VERSION__: JSON.stringify(pkg.version) },
  external: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
});
