// 主要フレーズの音声を edge-tts(Nanami) で事前生成して public/audio/ に同梱する。
// 実行: node scripts/generate-audio.mjs  （/tmp/kvenv の edge-tts を使用）
// 生成対象は speakText() に渡る文言と完全一致させる:
//   単語(ttsText||word) / 「◯◯は どれかな？」(きく) / 「◯◯は どれ？」(えらぶ) / 「テーマ名は どれ？」(なかまわけ)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PY = '/tmp/kvenv/bin/python';
const VOICE = process.env.VOICE || 'ja-JP-NanamiNeural';
const OUT_DIR = join(ROOT, 'public', 'audio');

// --- vocab から読み上げテキスト(ttsText||word)を抽出 ---
const vocabSrc = readFileSync(join(ROOT, 'data', 'vocabulary.ts'), 'utf8');
const speakBases = [];
for (const line of vocabSrc.split('\n')) {
  const w = line.match(/word:\s*'([^']+)'/);
  if (!w) continue;
  const tts = line.match(/ttsText:\s*'([^']+)'/);
  speakBases.push(tts ? tts[1] : w[1]);
}

// --- themes から テーマ名を抽出 ---
const themeSrc = readFileSync(join(ROOT, 'data', 'themes.ts'), 'utf8');
const themeNames = [...themeSrc.matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1]);

// --- フレーズ列挙（speakText の文言と一致）---
const phrases = new Set();
for (const b of speakBases) {
  phrases.add(b);
  phrases.add(`${b}は どれかな？`);
  phrases.add(`${b}は どれ？`);
}
for (const t of themeNames) phrases.add(`${t}は どれ？`);

const list = [...phrases];
console.log(`音声: ${VOICE}`);
console.log(`単語${speakBases.length} / テーマ${themeNames.length} → フレーズ ${list.length} 件`);

mkdirSync(OUT_DIR, { recursive: true });
const manifest = {};
let made = 0, skipped = 0;
list.forEach((text, idx) => {
  const hash = createHash('sha1').update(text).digest('hex').slice(0, 12);
  const file = `${hash}.mp3`;
  const out = join(OUT_DIR, file);
  manifest[text] = file;
  if (existsSync(out)) { skipped++; }
  else {
    execFileSync(PY, ['-m', 'edge_tts', '--voice', VOICE, '--text', text, '--write-media', out]);
    made++;
  }
  if ((idx + 1) % 20 === 0) console.log(`  ${idx + 1}/${list.length}`);
});

const ts = `// 自動生成: scripts/generate-audio.mjs（編集しない）。フレーズ→同梱mp3ファイル名。\nexport const AUDIO_MANIFEST: Record<string, string> = ${JSON.stringify(manifest, null, 2)};\n`;
writeFileSync(join(ROOT, 'data', 'audioManifest.ts'), ts);
console.log(`生成 ${made} / スキップ ${skipped} / manifest ${Object.keys(manifest).length}件 → data/audioManifest.ts`);
console.log('done');
