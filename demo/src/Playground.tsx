import { useState } from 'react';
import { Macbook, MacbookStage, type LightingPreset } from 'rigged-macbook-3d';

/** Sliders driving <Macbook> props directly — the headless API, visible. */
export default function Playground() {
  const [open, setOpen] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [yaw, setYaw] = useState(-0.4);
  const [pitch, setPitch] = useState(0.15);
  const [lighting, setLighting] = useState<LightingPreset>('studio-dark');

  return (
    <section className="playground">
      <h2>Playground — the headless API</h2>
      <p>Every value below is just a prop on <code>&lt;Macbook&gt;</code>.</p>
      <div className="stage">
        <MacbookStage lighting={lighting}>
          <group rotation={[pitch, yaw, 0]}>
            <Macbook
              modelSrc="/macbook-rigged.glb"
              open={open}
              brightness={brightness}
              screen={{ src: '/videos/demo.webm', fallbackSrc: '/videos/demo.mp4' }}
            />
          </group>
        </MacbookStage>
      </div>
      <div className="controls">
        <label>open: {open.toFixed(2)}
          <input type="range" min="0" max="1" step="0.01" value={open} onChange={(e) => setOpen(+e.target.value)} />
        </label>
        <label>brightness: {brightness.toFixed(2)}
          <input type="range" min="0" max="1" step="0.01" value={brightness} onChange={(e) => setBrightness(+e.target.value)} />
        </label>
        <label>yaw: {yaw.toFixed(2)}
          <input type="range" min="-1.2" max="1.2" step="0.01" value={yaw} onChange={(e) => setYaw(+e.target.value)} />
        </label>
        <label>pitch: {pitch.toFixed(2)}
          <input type="range" min="-0.5" max="0.8" step="0.01" value={pitch} onChange={(e) => setPitch(+e.target.value)} />
        </label>
        <label>lighting
          <select value={lighting} onChange={(e) => setLighting(e.target.value as LightingPreset)}>
            <option value="studio-dark">studio-dark</option>
            <option value="studio-light">studio-light</option>
            <option value="soft">soft</option>
          </select>
        </label>
      </div>
    </section>
  );
}
