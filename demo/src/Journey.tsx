import { MacbookScroll } from 'rigged-macbook-3d';

/** The full scroll journey: pin, lid open, dive, hold on the playing video, recede. */
export default function Journey() {
  return (
    <MacbookScroll
      height="400vh"
      screen={{ src: '/videos/demo.webm', fallbackSrc: '/videos/demo.mp4' }}
      modelSrc="/macbook-rigged.glb"
      fallback={
        <div className="hero">
          <p>This demo needs WebGL2 and motion enabled — here’s a quiet fallback instead.</p>
        </div>
      }
    />
  );
}
