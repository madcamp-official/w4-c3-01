/** Global SVG filter defs that give borders/icons the hand-drawn "sketchy" look (.sk / .sk2 / .icon-sk classes in global.css). */
export default function SketchyDefs() {
  return (
    <svg className="defs" aria-hidden="true">
      <filter id="sketchyA" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04 0.08" numOctaves={2} seed={3} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={1.3} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="sketchyB" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.045 0.07" numOctaves={2} seed={9} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={1.1} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="sketchyLight" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05 0.08" numOctaves={2} seed={5} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={1.1} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
