import { useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { AirDrawingStage, type AirDrawingCapture, type AirDrawingMode } from '@/features/air-drawing/AirDrawingStage'
import { postToNative } from './bridge'
// .shutter/.side-btn/.icon-btn/.sk/.sk2 and the --ink/--paper CSS vars that
// air-drawing.css relies on all live in the main app's stylesheet, which the
// airview bundle otherwise never loads.
import '@/styles/global.css'

// Config comes from the URL's query string, not window.__AIR_CONFIG__/
// injectedJavaScriptBeforeContentLoaded — against a fast local server (see
// AirDrawingWebView.tsx) the injected script sometimes lost the race against
// this page's own inline script, silently falling back to mode:'post'. Query
// params are part of the initial request, so there's no race to lose.
const params = new URLSearchParams(window.location.search)
const modeParam = params.get('mode')
const config = {
  mode: (modeParam === 'heart' || modeParam === 'message' || modeParam === 'lounge' ? modeParam : 'post') as AirDrawingMode,
  outputSize: params.has('outputSize') ? Number(params.get('outputSize')) : undefined,
  maxDim: params.has('maxDim') ? Number(params.get('maxDim')) : undefined
}

function Root() {
  const handleCapture = useCallback((capture: AirDrawingCapture) => {
    postToNative({ type: 'capture', payload: capture })
  }, [])

  const handleClose = useCallback(() => {
    postToNative({ type: 'close' })
  }, [])

  const handleError = useCallback((message: string) => {
    postToNative({ type: 'error', message })
  }, [])

  return (
    <AirDrawingStage
      mode={config.mode}
      outputSize={config.outputSize}
      maxDim={config.maxDim}
      onCapture={handleCapture}
      onClose={handleClose}
      onError={handleError}
    />
  )
}

postToNative({ type: 'ready' })
createRoot(document.getElementById('root')!).render(<Root />)
