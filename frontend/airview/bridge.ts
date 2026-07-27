// RN <-> WebView message protocol for the air-drawing bridge (plan Phase 4).
// Mirrored on the RN side by mobile/src/components/AirDrawingWebView.tsx —
// keep both in sync.
//
// mode/outputSize/maxDim travel as URL query params (see main.tsx), not
// through window.__AIR_CONFIG__/injectedJavaScriptBeforeContentLoaded —
// against a fast local server the injected script can lose the race against
// this page's own inline script and silently fall back to defaults. Query
// params are part of the initial request, so there's no race to lose.
import type { AirDrawingCapture } from '@/features/air-drawing/AirDrawingStage'

export type AirViewToNativeMessage =
  | { type: 'ready' }
  | { type: 'status'; status: string }
  | { type: 'capture'; payload: AirDrawingCapture }
  | { type: 'close' }
  | { type: 'error'; message: string }

export function postToNative(message: AirViewToNativeMessage): void {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message))
  } else {
    // RN WebView 밖(데스크톱/모바일 브라우저에서 직접 열어 테스트하는 경우)에서는
    // postMessage를 받아줄 상대가 없어서 조용히 사라지므로, 콘솔에라도 남겨둡니다.
    console.log('[airview -> native]', message)
  }
}

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void }
  }
}
