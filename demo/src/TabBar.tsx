/** Example overlay: a segmented tab bar driven entirely by MacbookScroll's
 *  onActiveScreen callback + scrollToScreen handle. Plain DOM — copy freely. */
export default function TabBar({
  labels, active, onSelect,
}: {
  labels: string[];
  active: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="tabbar" role="tablist" aria-label="Screens">
      {labels.map((label, i) => (
        <button key={label} role="tab" aria-selected={i === active} className={i === active ? 'active' : ''} onClick={() => onSelect(i)}>
          {label}
        </button>
      ))}
    </div>
  );
}
