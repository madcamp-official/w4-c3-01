import { useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { AirDrawingStage, type AirDrawingCapture } from '@/features/air-drawing/AirDrawingStage'
import { postToNative } from './bridge'
// .shutter/.side-btn/.icon-btn/.sk/.sk2 and the --ink/--paper CSS vars that
// air-drawing.css relies on all live in the main app's stylesheet, which the
// airview bundle otherwise never loads.
import '@/styles/global.css'

const config = window.__AIR_CONFIG__ ?? { mode: 'post' as const }

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
