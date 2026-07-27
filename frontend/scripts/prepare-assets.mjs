import { createWriteStream, existsSync, mkdirSync, readdirSync, copyFileSync, statSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const root = resolve(process.cwd())
const wasmSource = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const wasmTarget = join(root, 'public', 'wasm')
const modelTarget = join(root, 'public', 'models', 'hand_landmarker.task')
const modelUrl =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

function copyWasmAssets() {
  if (!existsSync(wasmSource)) {
    throw new Error(
      `MediaPipe WASM 폴더를 찾지 못했습니다: ${wasmSource}\n먼저 npm install을 실행해주세요.`,
    )
  }

  mkdirSync(wasmTarget, { recursive: true })

  for (const filename of readdirSync(wasmSource)) {
    const sourceFile = join(wasmSource, filename)
    const targetFile = join(wasmTarget, filename)

    if (statSync(sourceFile).isFile()) {
      copyFileSync(sourceFile, targetFile)
    }
  }

  console.log('✓ MediaPipe WASM 파일을 public/wasm으로 복사했습니다.')
}

async function downloadModel() {
  if (existsSync(modelTarget) && statSync(modelTarget).size > 1_000_000) {
    console.log('✓ 손 인식 모델이 이미 준비되어 있습니다.')
    return
  }

  mkdirSync(dirname(modelTarget), { recursive: true })
  console.log('손 인식 모델을 한 번만 내려받는 중입니다...')

  const response = await fetch(modelUrl, { redirect: 'follow' })
  if (!response.ok || !response.body) {
    throw new Error(`모델 다운로드 실패: HTTP ${response.status} ${response.statusText}`)
  }

  try {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(modelTarget))
  } catch (error) {
    if (existsSync(modelTarget)) unlinkSync(modelTarget)
    throw error
  }

  if (statSync(modelTarget).size < 1_000_000) {
    unlinkSync(modelTarget)
    throw new Error('다운로드한 모델 파일이 비정상적으로 작습니다.')
  }

  console.log('✓ 손 인식 모델을 public/models에 저장했습니다.')
}

try {
  copyWasmAssets()
  await downloadModel()
} catch (error) {
  console.error('\n[MediaPipe 준비 실패]')
  console.error(error instanceof Error ? error.message : error)
  console.error('\n아래 README의 수동 다운로드 방법을 확인해주세요.\n')
  process.exit(1)
}
