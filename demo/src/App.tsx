import Playground from './Playground';

export default function App() {
  return (
    <>
      <header className="hero">
        <h1>rigged-macbook-3d</h1>
        <p>
          A genuinely rigged 3D MacBook for React — a real hinge, a real screen, real studio
          lighting. Scroll to open it, or drive every parameter yourself below.
        </p>
        <code>npm i rigged-macbook-3d three @react-three/fiber @react-three/drei</code>
      </header>
      <div id="journey-stub" />
      <Playground />
      <footer>
        Model: “MacBook Pro M3 16-inch 2024” by jackbaeten (CC-BY 4.0) · rigged by William
        Laverty · <a href="https://github.com/williamlaverty/rigged-macbook-3d">GitHub</a>
      </footer>
    </>
  );
}
