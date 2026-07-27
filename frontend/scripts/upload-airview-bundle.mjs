import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Uploads the built airview bundle (mobile/assets/air-drawing-webview/) to the
// public `air-drawing-webview` Storage bucket, so the mobile app can download
// it on first camera-screen open instead of needing a dev-machine server +
// adb reverse (see mobile/src/components/AirDrawingWebView.tsx).
// Run after `npm run build:airview`.

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  throw new Error('frontend/.env에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY가 필요합니다.');
}

const supabase = createClient(url, anonKey);
const root = resolve(process.cwd(), '../mobile/assets/air-drawing-webview');
if (!existsSync(root)) {
  throw new Error(`빌드 결과물이 없습니다: ${root}\n먼저 npm run build:airview를 실행해주세요.`);
}

function walk(dir, base = '') {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    if (statSync(full).isDirectory()) files.push(...walk(full, rel));
    else files.push({ full, rel });
  }
  return files;
}

const CONTENT_TYPES = {
  html: 'text/html',
  js: 'application/javascript',
  wasm: 'application/wasm',
  task: 'application/octet-stream'
};

async function main() {
  const files = walk(root);
  console.log(`업로드할 파일 ${files.length}개 발견`);

  for (const { full, rel } of files) {
    const ext = rel.split('.').pop();
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
    const body = readFileSync(full);
    const { error } = await supabase.storage.from('air-drawing-webview').upload(rel, body, {
      contentType,
      upsert: true
    });
    if (error) throw new Error(`${rel} 업로드 실패: ${error.message}`);
    console.log(`✓ ${rel} (${(body.length / 1024).toFixed(0)} KB)`);
  }

  // 앱이 로컬 캐시를 언제 다시 받을지 판단하는 버전 마커 — 매 업로드마다 갱신.
  // (AirDrawingWebView.tsx의 ensureBundleCached가 이 값을 비교합니다.)
  const version = String(Date.now());
  const { error: versionError } = await supabase.storage
    .from('air-drawing-webview')
    .upload('version.txt', version, { contentType: 'text/plain', upsert: true });
  if (versionError) throw new Error(`version.txt 업로드 실패: ${versionError.message}`);
  console.log(`✓ version.txt (${version})`);

  console.log('\n✓ air-drawing-webview 버킷 업로드 완료.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
