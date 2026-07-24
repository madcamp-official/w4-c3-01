import { useState } from 'react';
import { PEN_WEIGHTS } from '@/lib/canvas';

export default function WeightPicker({ onChange }: { onChange: (w: number) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="weight-row">
      {PEN_WEIGHTS.map((w, i) => (
        <button
          key={w}
          className={'weight-btn' + (i === activeIndex ? ' active' : '')}
          onClick={() => {
            setActiveIndex(i);
            onChange(w);
          }}
        >
          <span className="weight-dot" style={{ width: 5 + i * 5, height: 5 + i * 5 }} />
        </button>
      ))}
    </div>
  );
}
