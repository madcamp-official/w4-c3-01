// Replaces frontend/src/mock/store.ts's canvas-rendered defaultHeartUrl() —
// RN has no <canvas>, so this is a static placeholder used only when a user
// skips drawing a heart during onboarding (real heart drawings come from the
// air-drawing WebView going forward, see Phase 4).
export const DEFAULT_HEART_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
