/**
 * Global SVG filter defs that give borders/icons the hand-drawn "sketchy" look
 * (.sk / .sk2 / .icon-sk classes in global.css). Parameters match
 * 4주차/week4/ALine Prototype.dc.html's #sketchy/#sketchySoft filters.
 */
export default function SketchyDefs() {
  return (
    <svg className="defs" aria-hidden="true">
      <filter id="sketchyA" x="-30%" y="-30%" width="160%" height="160%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves={2} seed={7} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={3} />
      </filter>
      <filter id="sketchyB" x="-30%" y="-30%" width="160%" height="160%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02 0.032" numOctaves={2} seed={13} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={2.8} />
      </filter>
      <filter id="sketchyLight" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035 0.06" numOctaves={2} seed={11} result="n2" />
        <feDisplacementMap in="SourceGraphic" in2="n2" scale={1.6} />
      </filter>
    </svg>
  );
}
