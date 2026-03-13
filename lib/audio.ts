// Web Audio API による効果音生成
// MP3ファイル不要 — 全てプログラムで合成

type SoundType = 'correct' | 'wrong' | 'complete' | 'tap';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  // iOSではユーザーインタラクション後にresumeが必要
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// AudioContextはplaySound()初回呼び出し時に自動作成される（遅延初期化）
// preloadSoundsとinitAudioForInteractionは不要（ユーザー操作前のAudioContext作成を防止）

// ===== 音色生成ヘルパー =====

function createGain(ctx: AudioContext, volume: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(ctx.destination);
  return gain;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  destination?: AudioNode,
): OscillatorNode {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(destination || ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
  return osc;
}

// ===== 各効果音の定義 =====

/** 正解音: 明るい2音の上昇チャイム（ピンポーン♪） */
function playCorrectSound(ctx: AudioContext): void {
  const now = ctx.currentTime;
  // ド → ミ → ソ の和音風上昇
  playTone(ctx, 523.25, now, 0.15, 0.25, 'sine');         // C5
  playTone(ctx, 659.25, now + 0.1, 0.15, 0.25, 'sine');   // E5
  playTone(ctx, 783.99, now + 0.2, 0.35, 0.3, 'sine');    // G5 (長め)

  // きらきら感を加えるハーモニクス
  playTone(ctx, 1046.5, now + 0.2, 0.3, 0.1, 'sine');     // C6 (薄く重ねる)
}

/** 不正解音: やさしい「ブッブー」（子どもが怖がらない柔らかい音） */
function playWrongSound(ctx: AudioContext): void {
  const now = ctx.currentTime;
  // 低めの柔らかいブザー（2回短く）
  playTone(ctx, 220, now, 0.15, 0.15, 'triangle');           // A3
  playTone(ctx, 196, now, 0.15, 0.1, 'sine');                // G3 (不協和音を避けて低め)
  playTone(ctx, 220, now + 0.2, 0.15, 0.15, 'triangle');     // A3 もう一度
  playTone(ctx, 196, now + 0.2, 0.15, 0.1, 'sine');          // G3
}

/** 完了音: 華やかなファンファーレ（ドミソド♪） */
function playCompleteSound(ctx: AudioContext): void {
  const now = ctx.currentTime;
  // ドミソの上昇アルペジオ + 最後のオクターブ上ド
  playTone(ctx, 523.25, now, 0.2, 0.2, 'sine');             // C5
  playTone(ctx, 659.25, now + 0.15, 0.2, 0.2, 'sine');      // E5
  playTone(ctx, 783.99, now + 0.3, 0.2, 0.2, 'sine');       // G5
  playTone(ctx, 1046.5, now + 0.5, 0.5, 0.3, 'sine');       // C6 (華やかに長く)

  // 和音で厚みを出す
  playTone(ctx, 783.99, now + 0.5, 0.4, 0.15, 'sine');      // G5
  playTone(ctx, 659.25, now + 0.5, 0.4, 0.1, 'sine');       // E5

  // きらきら高音
  playTone(ctx, 2093, now + 0.55, 0.3, 0.06, 'sine');       // C7 (薄いきらめき)
  playTone(ctx, 2637, now + 0.65, 0.25, 0.04, 'sine');      // E7
}

/** タップ音: 軽い「ポコ」（UI操作の小さなフィードバック） */
function playTapSound(ctx: AudioContext): void {
  const now = ctx.currentTime;
  // 短く軽い高音のポップ
  playTone(ctx, 880, now, 0.06, 0.12, 'sine');              // A5
  playTone(ctx, 1318.5, now, 0.04, 0.06, 'sine');           // E6
}

// ===== 公開API =====

export function playSound(type: SoundType): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    switch (type) {
      case 'correct':
        playCorrectSound(ctx);
        break;
      case 'wrong':
        playWrongSound(ctx);
        break;
      case 'complete':
        playCompleteSound(ctx);
        break;
      case 'tap':
        playTapSound(ctx);
        break;
    }
  } catch {
    // Web Audio API 非対応環境は無視
  }
}
