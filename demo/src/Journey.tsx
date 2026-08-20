import { useRef, useState } from 'react';
import { MacbookScroll, type MacbookScrollHandle } from 'rigged-macbook-3d';
import TabBar from './TabBar';

const SCREENS = [
  { src: '/videos/inbox1.webm', fallbackSrc: '/videos/inbox1.mp4', label: 'Inbox' },
  { src: '/videos/replies1.webm', fallbackSrc: '/videos/replies1.mp4', label: 'Replies' },
  { src: '/videos/triage1.webm', fallbackSrc: '/videos/triage1.mp4', label: 'Triage' },
  { src: '/videos/search1.webm', fallbackSrc: '/videos/search1.mp4', label: 'Search' },
  { src: '/videos/private1.webm', fallbackSrc: '/videos/private1.mp4', label: 'Private' },
];

/** The full scroll journey: pin, lid open, dive, screen walkthrough, recede. */
export default function Journey() {
  const scrollRef = useRef<MacbookScrollHandle>(null);
  const [active, setActive] = useState(0);

  return (
    <MacbookScroll
      ref={scrollRef}
      height="600vh"
      screens={SCREENS}
      modelSrc="/macbook-rigged.glb"
      onActiveScreen={setActive}
      fallback={
        <div className="hero">
          <p>This demo needs WebGL2 and motion enabled — here’s a quiet fallback instead.</p>
        </div>
      }
    >
      <TabBar labels={SCREENS.map((s) => s.label)} active={active} onSelect={(i) => scrollRef.current?.scrollToScreen(i)} />
    </MacbookScroll>
  );
}
