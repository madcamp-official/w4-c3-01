import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { StrokePoint } from '@/types';

export interface PlacementDraft {
  image: string;
  strokes: StrokePoint[];
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface PlacementValue {
  draft: PlacementDraft | null;
  startPlacing: (image: string, strokes: StrokePoint[]) => void;
  updateDraft: (patch: Partial<PlacementDraft>) => void;
  clearDraft: () => void;
}

const PlacementContext = createContext<PlacementValue | null>(null);

export function PlacementProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<PlacementDraft | null>(null);

  const value = useMemo<PlacementValue>(
    () => ({
      draft,
      startPlacing: (image, strokes) => setDraft({ image, strokes, x: 0.5, y: 0.45, scale: 1, rotation: 0 }),
      updateDraft: (patch) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev)),
      clearDraft: () => setDraft(null)
    }),
    [draft]
  );

  return <PlacementContext.Provider value={value}>{children}</PlacementContext.Provider>;
}

export function usePlacement(): PlacementValue {
  const ctx = useContext(PlacementContext);
  if (!ctx) throw new Error('usePlacement must be used within PlacementProvider');
  return ctx;
}
