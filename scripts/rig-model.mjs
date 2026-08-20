/**
 * Bake the rigged MacBook GLB from the Draco-compressed source export.
 *
 * Source: assets/macbook-source.glb — jackbaeten "MacBook Pro M3 16-inch 2024"
 * (CC-BY 4.0, see the asset extras embedded below). The raw export fuses the
 * lid and base aluminium into single meshes, so this script performs the rig
 * once, offline, producing a ready-to-use GLB:
 *
 *   1. recolour the light aluminium materials to Space Black (normal maps kept
 *      for the brushed texture; textured / already-dark surfaces left alone),
 *      tagging them via glTF `extras` so a runtime can apply the
 *      three.js-only envMapIntensity tweak;
 *   2. bake every mesh into model space, split each geometry into connected
 *      components (union-find) and classify whole shells as lid/base by
 *      centroid — this traces the real lid/chassis seam instead of slicing
 *      through geometry with a plane;
 *   3. reparent the lid triangles under a pivot on the model's hinge axis
 *      (node `LidPivot`; animate its rotation.x to open/close) with the
 *      screen panel isolated as node `Screen` so a runtime can swap in a
 *      demo-video material;
 *   4. dedup/prune/compact and meshopt-compress the result.
 *
 * Output: assets/macbook-rigged.glb.
 * Run via:  npm run bake
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  transformMesh,
  compactPrimitive,
  dedup,
  prune,
  weld,
  meshopt,
  draco,
} from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import draco3d from 'draco3d';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/macbook-source.glb');
const OUT = path.join(ROOT, 'assets/macbook-rigged.glb');

// ── Rig constants (model space of the source GLB) ───────────────────────────
// These are keyed to this exact export; if the source model is re-exported or
// replaced, re-tune them here (they were found by visual verification). This is
// the ONLY place hinge coordinates are authored: the runtime reads them back
// off the baked `LidPivot` node, so a re-bake propagates everywhere.
const SCREEN_MATERIAL_NAME = 'sfCQkHOWyrsLmor'; // emissive display panel
const SPACE_BLACK = [0.05, 0.05, 0.06]; // linear RGB, matches THREE.Color.setRGB
const HINGE_Y = -0.5; // hinge axis (= pivot) Y, from the model's hinge bar
const HINGE_Z = -12.2; // hinge axis (= pivot) Z
// Component classifier plane (applied to each component's centroid): "lid"
// when (centroid - hinge) · normal > SPLIT_OFFSET — i.e. the centroid sits
// behind the hinge, toward the screen.
const SPLIT_NY = 0.0;
const SPLIT_NZ = -1.0;
const SPLIT_OFFSET = 0.0;

const isLidSide = (cy, cz) => (cy - HINGE_Y) * SPLIT_NY + (cz - HINGE_Z) * SPLIT_NZ > SPLIT_OFFSET;

/**
 * Split a primitive's triangles into [lid, base] index arrays by CONNECTED
 * COMPONENT: the lid shell and base shell are separate surfaces (split by the
 * physical hinge gap), so union-find the vertices into components and classify
 * each whole component by its centroid.
 */
function splitByHinge(prim) {
  const pos = prim.getAttribute('POSITION');
  const count = pos.getCount();
  const indexAccessor = prim.getIndices();
  const idx = indexAccessor
    ? Array.from(indexAccessor.getArray())
    : Array.from({ length: count }, (_, i) => i);

  const parent = new Int32Array(count);
  for (let i = 0; i < count; i++) parent[i] = i;
  const find = (x) => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let t = 0; t < idx.length; t += 3) { union(idx[t], idx[t + 1]); union(idx[t + 1], idx[t + 2]); }

  // Accumulate each component's centroid, then classify the whole component.
  const el = [0, 0, 0];
  const acc = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const v = idx[t + k];
      const r = find(v);
      let a = acc.get(r);
      if (!a) { a = { y: 0, z: 0, n: 0 }; acc.set(r, a); }
      pos.getElement(v, el);
      a.y += el[1]; a.z += el[2]; a.n++;
    }
  }
  const lidComponent = new Map();
  acc.forEach((a, r) => lidComponent.set(r, isLidSide(a.y / a.n, a.z / a.n)));

  const lid = [];
  const base = [];
  for (let t = 0; t < idx.length; t += 3) {
    (lidComponent.get(find(idx[t])) ? lid : base).push(idx[t], idx[t + 1], idx[t + 2]);
  }
  return { lid, base };
}

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    // The source GLB is Draco-compressed; the output uses meshopt instead
    // (decoded by three-stdlib's bundled MeshoptDecoder — no runtime WASM fetch).
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
  });

const doc = await io.read(SRC);
const root = doc.getRoot();
root.getAsset().extras = {
  ...root.getAsset().extras,
  title: 'MacBook Pro M3 16-inch 2024 (rigged)',
  author: 'jackbaeten (https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4)',
  license: 'CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/)',
  modifications: 'Space-Black recolour, hinge lid/base split, LidPivot rig, meshopt compression — rigged-macbook-3d (https://github.com/williamlaverty/rigged-macbook-3d)',
};
const scene = root.getDefaultScene() ?? root.listScenes()[0];

// Geometry is fully decoded on read; drop the source's Draco extension so the
// writer doesn't try to re-encode with it (the output is meshopt-compressed).
for (const ext of root.listExtensionsUsed()) {
  if (ext.extensionName === 'KHR_draco_mesh_compression') ext.dispose();
}

// ── 1. Recolour the light aluminium to Space Black ──────────────────────────
// Skip the screen and textured materials; classify by lightness of the linear
// baseColorFactor (same test the runtime rig used on THREE.Color, which also
// stores linear values).
let recoloured = 0;
for (const mat of root.listMaterials()) {
  if (mat.getName() === SCREEN_MATERIAL_NAME || mat.getBaseColorTexture()) continue;
  const [r, g, b, a] = mat.getBaseColorFactor();
  const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
  if (l > 0.22) {
    mat.setBaseColorFactor([...SPACE_BLACK, a]);
    // Fully metallic (no plastic diffuse term) with a satin anodised
    // roughness — reads as real Space-Black aluminium. envMapIntensity is a
    // three.js-only property, so tag the material and let the runtime set it.
    mat.setMetallicFactor(1.0);
    mat.setRoughnessFactor(0.5);
    mat.setExtras({ ...mat.getExtras(), spaceBlack: true });
    recoloured++;
  }
}

// ── 2. Bake world transforms and split every mesh at the hinge ──────────────
// Snapshot nodes + world matrices before mutating anything, so nested
// transforms are still intact when each mesh is baked.
const meshNodes = [];
scene.traverse((node) => {
  if (node.getMesh()) meshNodes.push({ node, world: node.getWorldMatrix() });
});

const lidPrims = []; // { prim, isScreen }
const basePrims = [];

const seenMeshes = new Set();
for (const { node, world } of meshNodes) {
  let mesh = node.getMesh();
  // A mesh instanced by several nodes gets a distinct world transform per
  // node — clone so each instance is baked independently.
  if (seenMeshes.has(mesh)) {
    mesh = mesh.clone();
    node.setMesh(mesh);
  }
  seenMeshes.add(mesh);
  // transformMesh clones primitives/attributes shared with other meshes, so
  // the bake never double-transforms shared vertex streams.
  transformMesh(mesh, world);

  for (const prim of mesh.listPrimitives()) {
    const isScreen = prim.getMaterial()?.getName() === SCREEN_MATERIAL_NAME;
    const { lid, base } = splitByHinge(prim);
    if (lid.length && base.length) {
      // Shared shell: clone for the lid, shrink the original to the base tris.
      const lidPrim = prim.clone();
      lidPrim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(lid)));
      prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(base)));
      lidPrims.push({ prim: lidPrim, isScreen });
      basePrims.push(prim);
    } else if (lid.length) {
      lidPrims.push({ prim, isScreen });
    } else {
      basePrims.push(prim);
    }
  }
  // The source node hierarchy is replaced by the rig below; prune() drops the
  // emptied meshes and detached nodes.
  node.setMesh(null);
}

if (!lidPrims.length) {
  throw new Error('[bake] hinge split produced no lid — model geometry or HINGE_* constants changed?');
}
if (!lidPrims.some((p) => p.isScreen)) {
  throw new Error(`[bake] no primitive uses screen material "${SCREEN_MATERIAL_NAME}" — demos would not display.`);
}

// ── 3. Rebuild the scene: base + hinge pivot ─────────────────────────────────
// LidPivot sits on the model's hinge axis (animate rotation.x); LidHolder
// cancels the offset so the baked model-space lid sits correctly at angle 0.
const baseMesh = doc.createMesh('BaseMesh');
for (const prim of basePrims) baseMesh.addPrimitive(prim);
const baseNode = doc.createNode('Base').setMesh(baseMesh);

const lidMesh = doc.createMesh('LidMesh');
const screenMesh = doc.createMesh('ScreenMesh');
for (const { prim, isScreen } of lidPrims) (isScreen ? screenMesh : lidMesh).addPrimitive(prim);

const lidNode = doc.createNode('Lid').setMesh(lidMesh);
// Single-primitive mesh → three's GLTFLoader yields a Mesh object named after
// the node, which the runtime looks up to swap in the video material.
const screenNode = doc.createNode('Screen').setMesh(screenMesh);

const lidHolder = doc.createNode('LidHolder')
  .setTranslation([0, -HINGE_Y, -HINGE_Z])
  .addChild(lidNode)
  .addChild(screenNode);
const pivot = doc.createNode('LidPivot')
  .setTranslation([0, HINGE_Y, HINGE_Z])
  .addChild(lidHolder);
pivot.setExtras({
  lidOpenX: 0,
  lidClosedX: 1.94,
  screenBottomY: 1.25,
  screenBottomZ: -13.2,
  seatTargetY: 0.7,
});

for (const node of scene.listChildren()) scene.removeChild(node);
scene.addChild(baseNode).addChild(pivot);

if (screenMesh.listPrimitives().length !== 1) {
  throw new Error(`[bake] expected exactly 1 screen primitive, got ${screenMesh.listPrimitives().length}.`);
}

// ── 4. Optimise + compress ───────────────────────────────────────────────────
const COMPRESS = process.env.BAKE_COMPRESS ?? 'meshopt';
await doc.transform(
  dedup(),
  prune(),
  // Drop vertices stranded by the index-subset split before compressing.
  async (d) => {
    for (const mesh of d.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) compactPrimitive(prim);
    }
  },
  ...(COMPRESS === 'draco'
    ? [draco()]
    : [weld(), meshopt({ encoder: MeshoptEncoder, level: 'high' })]),
);

await io.write(OUT, doc);

const srcKB = (fs.statSync(SRC).size / 1024).toFixed(0);
const outKB = (fs.statSync(OUT).size / 1024).toFixed(0);
const lidTris = lidPrims.reduce((n, { prim }) => n + prim.getIndices().getCount() / 3, 0);
console.log(`[bake] recoloured ${recoloured} materials to Space Black`);
console.log(`[bake] lid: ${lidPrims.length} primitives (${lidTris} tris), base: ${basePrims.length} primitives`);
console.log(`[bake] ${srcKB}KB → ${outKB}KB (meshopt)  →  ${path.relative(ROOT, OUT)}`);
