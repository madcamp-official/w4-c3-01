import { existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Copies the MediaPipe WASM (SIMD + nosimd fallback only — vision_wasm_module_internal.*
// is unused, see plan Phase 6 asset trimming) and hand_landmarker.task model
// next to the built airview/index.html, so the WebView's runtime fetch()
// calls (see useHandTracking.ts's WASM_ROOT/MODEL_URL) resolve them relatively.
const root = resolve(process.cwd());
const wasmSource = join(root, 'public', 'wasm');
const modelSource = join(root, 'public', 'models', 'hand_landmarker.task');
const outDir = resolve(root, '../mobile/assets/air-drawing-webview');
const wasmTarget = join(outDir, 'wasm');
const modelTarget = join(outDir, 'models', 'hand_landmarker.task');

const WASM_FILES = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm'];

if (!existsSync(outDir)) {
  throw new Error(`airview 빌드 결과물이 없습니다: ${outDir}\n먼저 npm run build:airview를 실행해주세요.`);
}

mkdirSync(wasmTarget, { recursive: true });
for (const filename of WASM_FILES) {
  const source = join(wasmSource, filename);
  if (!existsSync(source)) throw new Error(`WASM 파일을 찾지 못했습니다: ${source}`);
  copyFileSync(source, join(wasmTarget, filename));
}
console.log('✓ MediaPipe WASM(SIMD + nosimd)을 mobile/assets/air-drawing-webview/wasm으로 복사했습니다.');

if (!existsSync(modelSource) || statSync(modelSource).size < 1_000_000) {
  throw new Error(`손 인식 모델이 없습니다: ${modelSource}\n먼저 npm run prepare:assets를 실행해주세요.`);
}
mkdirSync(join(outDir, 'models'), { recursive: true });
copyFileSync(modelSource, modelTarget);
console.log('✓ 손 인식 모델을 mobile/assets/air-drawing-webview/models로 복사했습니다.');
