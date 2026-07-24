interface ControlPanelProps {
  cameraActive: boolean
  drawing: boolean
  busy: boolean
  onStartCamera: () => void
  onToggleDrawing: () => void
  onClear: () => void
  onSwitchCamera: () => void
}

export function ControlPanel({
  cameraActive,
  drawing,
  busy,
  onStartCamera,
  onToggleDrawing,
  onClear,
  onSwitchCamera,
}: ControlPanelProps) {
  return (
    <div className="control-panel" aria-label="카메라 및 그리기 제어">
      {!cameraActive ? (
        <button className="control-button primary wide" onClick={onStartCamera} disabled={busy}>
          {busy ? '카메라 여는 중…' : '카메라 시작'}
        </button>
      ) : (
        <>
          <button
            className={`control-button ${drawing ? 'danger' : 'primary'}`}
            onClick={onToggleDrawing}
          >
            {drawing ? '그리기 중지' : '그리기 시작'}
          </button>
          <button className="control-button" onClick={onClear}>
            전체 지우기
          </button>
          <button className="control-button" onClick={onSwitchCamera} disabled={busy}>
            카메라 전환
          </button>
        </>
      )}
    </div>
  )
}
