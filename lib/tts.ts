// TTS統合 (Gemini TTS + Web Speech API フォールバック)
import { callGeminiTTS, ttsResultToBlob } from './gemini';

// iOS Safari対策: Audioオブジェクトを1つだけ作成し使い回す
let persistentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;
let isSpeakingNow = false;

// ブラウザTTS: 日本語音声をキャッシュ
let cachedJapaneseVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

// Gemini TTS: 音声キャッシュ (同じ単語の再生を高速化)
const audioCache = new Map<string, Blob>();
const MAX_CACHE_SIZE = 50;

function getOrCreateAudio(): HTMLAudioElement {
  if (!persistentAudio) {
    persistentAudio = new Audio();
    persistentAudio.setAttribute('playsinline', '');
  }
  return persistentAudio;
}

export function initAudioContext(): void {
  getOrCreateAudio();
  preloadVoices();
}

export function isSpeaking(): boolean {
  return isSpeakingNow;
}

export function stopSpeaking(): void {
  isSpeakingNow = false;
  if (persistentAudio) {
    persistentAudio.pause();
    persistentAudio.currentTime = 0;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
}

// ブラウザTTS音声のプリロード
function preloadVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const findJapaneseVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;
    voicesLoaded = true;

    // 優先順位: 日本語の高品質な女性音声
    const priorities = [
      (v: SpeechSynthesisVoice) => v.lang === 'ja-JP' && v.name.includes('Kyoko'),
      (v: SpeechSynthesisVoice) => v.lang === 'ja-JP' && v.name.includes('O-Ren'),
      (v: SpeechSynthesisVoice) => v.lang === 'ja-JP' && v.name.includes('Hattori'),
      (v: SpeechSynthesisVoice) => v.lang === 'ja-JP' && !v.name.includes('Google'),
      (v: SpeechSynthesisVoice) => v.lang === 'ja-JP',
      (v: SpeechSynthesisVoice) => v.lang.startsWith('ja'),
    ];

    for (const matcher of priorities) {
      const voice = voices.find(matcher);
      if (voice) {
        cachedJapaneseVoice = voice;
        return;
      }
    }
  };

  findJapaneseVoice();
  if (!voicesLoaded) {
    window.speechSynthesis.addEventListener('voiceschanged', findJapaneseVoice);
  }
}

async function playGeminiTTS(text: string, apiKey: string, voiceName: string, speed: number): Promise<void> {
  const cacheKey = `${voiceName}:${text}`;

  let blob = audioCache.get(cacheKey);
  if (!blob) {
    const result = await callGeminiTTS(text, apiKey, voiceName);
    blob = ttsResultToBlob(result);

    // キャッシュに保存（上限管理）
    if (audioCache.size >= MAX_CACHE_SIZE) {
      const firstKey = audioCache.keys().next().value;
      if (firstKey) audioCache.delete(firstKey);
    }
    audioCache.set(cacheKey, blob);
  }

  const url = URL.createObjectURL(blob);

  if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
  currentAudioUrl = url;

  const audio = getOrCreateAudio();
  audio.src = url;
  audio.playbackRate = speed;
  isSpeakingNow = true;

  return new Promise<void>((resolve) => {
    audio.onended = () => {
      isSpeakingNow = false;
      resolve();
    };
    audio.onerror = () => {
      isSpeakingNow = false;
      resolve();
    };
    audio.play().catch(() => {
      isSpeakingNow = false;
      resolve();
    });
  });
}

/** ブラウザTTS用: 助詞「は」を「わ」に変換（自然な発音のため） */
function convertParticleHa(text: string): string {
  // 「〜は どれ」「〜は？」など助詞の「は」を「わ」に変換
  return text.replace(/は(\s|？|。|、|$)/g, 'わ$1');
}

function playBrowserTTS(text: string, speed: number): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    // Chromeのバグ対策: cancel→少し待ってからspeak
    window.speechSynthesis.cancel();

    // 助詞「は」の発音修正
    const ttsText = convertParticleHa(text);
    const utterance = new SpeechSynthesisUtterance(ttsText);
    utterance.lang = 'ja-JP';
    utterance.rate = speed;
    utterance.pitch = 1.1; // 子ども向けに少し高め

    // 明示的に日本語音声を設定
    if (cachedJapaneseVoice) {
      utterance.voice = cachedJapaneseVoice;
    }

    isSpeakingNow = true;
    utterance.onend = () => { isSpeakingNow = false; resolve(); };
    utterance.onerror = () => { isSpeakingNow = false; resolve(); };

    // Chrome バグ対策: 少し遅延を入れてから再生
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  });
}

/**
 * 音声を再生する
 * @param instant trueの場合、Gemini高品質音声を優先（最大3秒待機）。
 *               キャッシュがあれば即座に再生、なければGemini取得を試み、
 *               タイムアウト時のみブラウザTTSにフォールバック。
 *               falseの場合、Gemini取得を試みる（ボタンタップ用）。
 */
export async function speakText(
  text: string,
  apiKey: string | null,
  voiceName: string = 'Aoede',
  speed: number = 0.85,
  instant: boolean = false,
): Promise<void> {
  stopSpeaking();

  if (instant) {
    if (apiKey) {
      const cacheKey = `${voiceName}:${text}`;
      // キャッシュ済み → 即座にGemini高品質音声
      if (audioCache.has(cacheKey)) {
        await playGeminiTTS(text, apiKey, voiceName, speed);
        return;
      }
      // キャッシュなし → Geminiを最大3秒待つ（人間らしい声を優先）
      try {
        const geminiPromise = callGeminiTTS(text, apiKey, voiceName).then(result => {
          const blob = ttsResultToBlob(result);
          if (audioCache.size >= MAX_CACHE_SIZE) {
            const firstKey = audioCache.keys().next().value;
            if (firstKey) audioCache.delete(firstKey);
          }
          audioCache.set(cacheKey, blob);
          return blob;
        });
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
        const blob = await Promise.race([geminiPromise, timeoutPromise]);
        if (blob) {
          // Geminiが間に合った → 高品質音声で再生
          const url = URL.createObjectURL(blob);
          if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
          currentAudioUrl = url;
          const audio = getOrCreateAudio();
          audio.src = url;
          audio.playbackRate = speed;
          isSpeakingNow = true;
          await new Promise<void>((resolve) => {
            audio.onended = () => { isSpeakingNow = false; resolve(); };
            audio.onerror = () => { isSpeakingNow = false; resolve(); };
            audio.play().catch(() => { isSpeakingNow = false; resolve(); });
          });
          return;
        }
        // タイムアウト → ブラウザTTSにフォールバック
      } catch {
        // Gemini失敗 → ブラウザTTSにフォールバック
      }
    }
    await playBrowserTTS(text, speed);
    return;
  }

  // ボタンタップ: キャッシュにあればGemini、なければブラウザTTS
  if (apiKey) {
    const cacheKey = `${voiceName}:${text}`;
    if (audioCache.has(cacheKey)) {
      // キャッシュ済み → Gemini高品質音声
      await playGeminiTTS(text, apiKey, voiceName, speed);
      return;
    }
    // キャッシュなし → Gemini取得を試みる
    try {
      await playGeminiTTS(text, apiKey, voiceName, speed);
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('APIキーが無効')) throw e;
      // フォールバックへ
    }
  }
  await playBrowserTTS(text, speed);
}

/** 複数テキストのGemini音声をまとめてキャッシュに先読み */
export function prefetchAudio(texts: string[], apiKey: string | null, voiceName: string = 'Aoede'): void {
  if (!apiKey) return;
  // 同時リクエスト数を制限（3つずつ）
  let i = 0;
  const next = () => {
    if (i >= texts.length) return;
    const text = texts[i++];
    prefetchGeminiTTS(text, apiKey, voiceName);
    setTimeout(next, 200); // 200ms間隔で順次開始
  };
  // 最初の3つを同時開始
  for (let j = 0; j < Math.min(3, texts.length); j++) {
    next();
  }
}

/** Gemini音声をキャッシュに先読み（再生しない） */
function prefetchGeminiTTS(text: string, apiKey: string, voiceName: string): void {
  const cacheKey = `${voiceName}:${text}`;
  if (audioCache.has(cacheKey)) return;

  callGeminiTTS(text, apiKey, voiceName)
    .then(result => {
      const blob = ttsResultToBlob(result);
      if (audioCache.size >= MAX_CACHE_SIZE) {
        const firstKey = audioCache.keys().next().value;
        if (firstKey) audioCache.delete(firstKey);
      }
      audioCache.set(cacheKey, blob);
    })
    .catch(() => {}); // 先読み失敗は無視
}
