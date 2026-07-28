// Hand-drawn icon set — path data matches 4주차/week4/ALine Prototype.dc.html
// (the approved new design; 'x'/'link'/'message-square' aren't covered by
// that prototype so they keep their previous shape, just restyled). The web
// gets its wobble from an SVG feTurbulence/feDisplacementMap filter that
// Android's react-native-svg can't run natively (see src/lib/sketchyPath.ts),
// so each icon is instead drawn as two slightly-offset passes with a seeded,
// stable jitter — the same double-stroke trick hand-sketch renderers (e.g.
// rough.js) use.
import Svg, { Circle, G, Path } from 'react-native-svg';
import { colors } from '@/theme/colors';
import { sketchyIconJitter } from '@/lib/sketchyPath';

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
  | 'chevron-left';

type Def = { paths?: string[]; circles?: { cx: number; cy: number; r: number }[] };

const ICONS: Record<IconName, Def> = {
  home: { paths: ['M4 11L12 4l8 7', 'M6 10v9h5v-5h2v5h5v-9'] },
  'map-pin': {
    paths: ['M12 21s7-6.7 7-11.5A7 7 0 105 9.5C5 14.3 12 21 12 21z'],
    circles: [{ cx: 12, cy: 9.3, r: 2.3 }]
  },
  search: { paths: ['M15.5 15.5L21 21'], circles: [{ cx: 10.5, cy: 10.5, r: 6.2 }] },
  'edit-2': { paths: ['M4.5 19.5l1-4L15.7 5.3l3 3L8.5 18.5l-4 1z'] },
  send: { paths: ['M3 11.2L21 3l-7.3 18-2.4-8.1L3 11.2z'] },
  heart: {
    paths: [
      'M12 20.3s-7.3-4.4-9.6-8.7C.6 7.9 2.2 3.8 6.2 3.8c2.2 0 3.7 1.4 5.8 4 2.1-2.6 3.6-4 5.8-4 4 0 5.6 4.1 3.8 7.8-2.3 4.3-9.6 8.7-9.6 8.7z'
    ]
  },
  'message-circle': {
    paths: ['M3.5 5.5h17a1.7 1.7 0 011.7 1.7v8.6a1.7 1.7 0 01-1.7 1.7H9l-5 3.7v-3.7H3.5a1.7 1.7 0 01-1.7-1.7V7.2A1.7 1.7 0 013.5 5.5z']
  },
  x: { paths: ['M18 6 6 18', 'M6 6l12 12'] },
  link: {
    paths: [
      'M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1',
      'M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1'
    ]
  },
  'message-square': { paths: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'] },
  'chevron-left': { paths: ['M15.5 19L8 12l7.5-7'] }
};

export default function Icon({
  name,
  size = 22,
  color = colors.ink,
  strokeWidth = 2,
  sketchy = true
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  sketchy?: boolean;
}) {
  const def = ICONS[name];
  const passes = sketchy ? [1, 2] : [0];

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {passes.map((pass) => {
        const { dx, dy, rotate } = sketchy
          ? sketchyIconJitter(name, pass)
          : { dx: 0, dy: 0, rotate: 0 };
        return (
          <G
            key={pass}
            transform={`translate(${dx} ${dy}) rotate(${rotate} 12 12)`}
            opacity={sketchy ? 0.82 : 1}
          >
            {def.paths?.map((d, i) => (
              <Path
                key={i}
                d={d}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {def.circles?.map((c, i) => (
              <Circle
                key={i}
                cx={c.cx}
                cy={c.cy}
                r={c.r}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
              />
            ))}
          </G>
        );
      })}
    </Svg>
  );
}
