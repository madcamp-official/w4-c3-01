// Shared icon set — path data matches week4_1/ALine.dc.html exactly (the
// approved v2 design; 'x'/'link'/'message-square' aren't covered by that
// mockup so they keep their previous shape). Centralizing these (instead of
// inline <svg> per page) means icon shape changes only need to happen here
// going forward — mirrors mobile/src/components/Icon.tsx, which this stays
// in sync with.
import type { CSSProperties } from 'react';

export type IconName =
  | 'home'
  | 'map-pin'
  | 'search'
  | 'edit-2'
  | 'send'
  | 'heart'
  | 'message-circle'
  | 'x'
  | 'link'
  | 'message-square'
  | 'chevron-left'
  | 'sun'
  | 'moon'
  | 'bell';

interface Def {
  paths?: string[];
  circles?: { cx: number; cy: number; r: number }[];
  rects?: { x: number; y: number; width: number; height: number; rx?: number }[];
}

const ICONS: Record<IconName, Def> = {
  home: { paths: ['M4 11 L12 4 L20 11 M6 10 V20 H18 V10'] },
  'map-pin': {
    paths: ['M11 2 C5 2 2 6 2 11 C2 17 11 23 11 23 C11 23 20 17 20 11 C20 6 17 2 11 2 Z'],
    circles: [{ cx: 11, cy: 11, r: 3.4 }]
  },
  search: { paths: ['M16.5 16.5 L21 21'], circles: [{ cx: 11, cy: 11, r: 7 }] },
  'edit-2': { paths: ['M4 20 L4 16 L16 4 L20 8 L8 20 Z M13 7 L17 11'] },
  send: { paths: ['M3 11 L21 3 L14 21 L11 13 L3 11 Z'] },
  heart: {
    paths: [
      'M12 21 C6 16 2 12 2 8 C2 4.5 5 2 8 3.5 C10 4.3 11 6 12 7 C13 6 14 4.3 16 3.5 C19 2 22 4.5 22 8 C22 12 18 16 12 21 Z'
    ]
  },
  'message-circle': {
    paths: ['M8.7 18.3 L6.5 21.5 L12 19'],
    circles: [{ cx: 12, cy: 11, r: 8 }]
  },
  x: { paths: ['M4 4 L20 20 M20 4 L4 20'] },
  link: {
    paths: [
      'M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1',
      'M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1'
    ]
  },
  'message-square': { paths: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'] },
  'chevron-left': { paths: ['M16 2 L6 12 L16 22'] },
  sun: {
    paths: ['M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1'],
    circles: [{ cx: 12, cy: 12, r: 5 }]
  },
  moon: { paths: ['M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z'] },
  bell: {
    paths: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0']
  }
};

export default function Icon({
  name,
  size = 22,
  strokeWidth = 2,
  className = 'icon-sk',
  style
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const def = ICONS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      style={style}
    >
      {def.paths?.map((d, i) => (
        <path key={i} d={d} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {def.circles?.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />
      ))}
      {def.rects?.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} rx={r.rx} />
      ))}
    </svg>
  );
}
