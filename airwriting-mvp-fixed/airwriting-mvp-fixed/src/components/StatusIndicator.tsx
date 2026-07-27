import type { AppStatus } from '../types'

interface StatusIndicatorProps {
  status: AppStatus
  error?: string | null
}

export function StatusIndicator({ status, error }: StatusIndicatorProps) {
  return (
    <div className={`status-indicator ${error ? 'error' : ''}`} role="status" aria-live="polite">
      <span className="status-dot" />
      <span>{error ?? status}</span>
    </div>
  )
}
