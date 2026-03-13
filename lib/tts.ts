// TTS統合 (Gemini TTS + Web Speech API フォールバック)
// nano-storybook と同じアプローチ: Gemini優先、失敗時ブラウザTTSフォールバック
import { callGeminiTTS, ttsResultToBlob, isTTSQuotaExhausted } from './gemini';
import { getAudioCache, saveAudioCache } from './db';

// iOS Safari対策: Audioオブジェクトを1つだけ作成し使い回す
let persistentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;
let isSpeakingNow = false;
let speechCancelId = 0; // 音声キャンセル用ID

// ブラウザTTS: 日本語音声をキャッシュ
let cachedJapaneseVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

// Gemini TTS: セッション内Blobキャッシュ（IndexedDBからの読み込みを避ける）
const blobCache = new Map<string, Blob>();

function getOrCreateAudio(): HTMLAudioElement {
  if (!persistentAudio) {
    persistentAudio = new Audio();
    persistentAudio.setAttribute('playsinline', '');
  }
  return persistentAudio;
}

// preloadVoicesは初回speakText呼び出し時に自動実行（ページ読み込み時の音声API呼び出しをゼロにする）

export function isSpeaking(): boolean {
  return isSpeakingNow;
}

export function stopSpeaking(): void {
  speechCancelId++; // 進行中の音声をキャンセル
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

/** Gemini音声を再生（nano-storybookのplayGeminiAudioと同じアプローチ） */
async function playGeminiAudio(text: string, apiKey: string, voiceName: string, speed: number): Promise<void> {
  const myId = ++speechCancelId;
  const cacheKey = `${voiceName}:${text}`;

  // 1. セッション内Blobキャッシュ → 2. IndexedDB永続キャッシュ → 3. API呼び出し
  let blob = blobCache.get(cacheKey);
  if (!blob) {
    const cached = await getAudioCache(cacheKey);
    if (cached) {
      blob = ttsResultToBlob({ data: cached.data, mimeType: cached.mimeType });
      blobCache.set(cacheKey, blob);
    }
  }
  if (!blob) {
    // キャッシュミス＋クォータ枯渇 → API呼び出しせず即フォールバック
    if (isTTSQuotaExhausted()) {
      throw new Error('TTS_QUOTA_EXHAUSTED');
    }
    const result = await callGeminiTTS(text, apiKey, voiceName);
    if (speechCancelId !== myId) return;
    blob = ttsResultToBlob(result);
    blobCache.set(cacheKey, blob);
    // IndexedDBに永続保存（バックグラウンド、エラーは無視）
    saveAudioCache({ key: cacheKey, data: result.data, mimeType: result.mimeType, createdAt: Date.now() }).catch(() => {});
  }
  if (speechCancelId !== myId) return;

  // 前回のObjectURLを解放
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }

  const url = URL.createObjectURL(blob);
  currentAudioUrl = url;

  const audio = getOrCreateAudio();
  audio.src = url;
  audio.playbackRate = speed;
  isSpeakingNow = true;

  return new Promise<void>((resolve) => {
    audio.onended = () => {
      if (currentAudioUrl === url) {
        URL.revokeObjectURL(url);
        currentAudioUrl = null;
      }
      isSpeakingNow = false;
      resolve();
    };
    audio.onerror = () => {
      if (currentAudioUrl === url) {
        URL.revokeObjectURL(url);
        currentAudioUrl = null;
      }
      isSpeakingNow = false;
      playBrowserTTS(text, speed).then(resolve);
    };
    audio.play().catch(() => {
      if (currentAudioUrl === url) {
        URL.revokeObjectURL(url);
        currentAudioUrl = null;
      }
      isSpeakingNow = false;
      playBrowserTTS(text, speed).then(resolve);
    });
  });
}

/** ブラウザTTS用: 助詞「は」を「わ」に変換（自然な発音のため） */
function convertParticleHa(text: string): string {
  return text.replace(/は(\s|？|。|、|$)/g, 'わ$1');
}

function playBrowserTTS(text: string, speed: number): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const ttsText = convertParticleHa(text);
    const utterance = new SpeechSynthesisUtterance(ttsText);
    utterance.lang = 'ja-JP';
    utterance.rate = speed;
    utterance.pitch = 1.1;

    if (cachedJapaneseVoice) {
      utterance.voice = cachedJapaneseVoice;
    }

    isSpeakingNow = true;
    utterance.onend = () => { isSpeakingNow = false; resolve(); };
    utterance.onerror = () => { isSpeakingNow = false; resolve(); };

    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  });
}

/**
 * 音声を再生する（nano-storybookと同じアプローチ）
 * APIキーがあればGemini TTS（人間らしい声）を使用。
 * 失敗時のみブラウザTTSにフォールバック。
 */
export async function speakText(
  text: string,
  apiKey: string | null,
  voiceName: string = 'Aoede',
  speed: number = 0.85,
): Promise<void> {
  // ユーザー操作前は音声再生を試みない（AudioContext警告防止）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activation = typeof navigator !== 'undefined' ? (navigator as any).userActivation : undefined;
  if (activation && !activation.hasBeenActive) return;

  // 初回呼び出し時に日本語音声をロード（ページ読み込み時ではなくユーザー操作時）
  if (!voicesLoaded) preloadVoices();
  stopSpeaking();

  // Gemini TTS優先（nano-storybookと同じ）
  if (apiKey) {
    try {
      await playGeminiAudio(text, apiKey, voiceName, speed);
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('APIキーが無効')) throw e;
      // 静かにブラウザTTSへフォールバック
    }
  }
  await playBrowserTTS(text, speed);
}

/**
 * バックグラウンドプリキャッシュ。
 * 1. メモリキャッシュ → 2. IndexedDB → 3. API取得（クォータ枯渇時はスキップ）
 */
const precacheQueue: { text: string; voiceName: string }[] = [];
const precacheQueueKeys = new Set<string>();
let precacheWorkerRunning = false;
let precacheApiKey = '';

export function precacheAudio(
  words: { text: string; voiceName: string }[],
  apiKey: string,
): void {
  precacheApiKey = apiKey;

  const newItems: { text: string; voiceName: string }[] = [];
  for (const item of words) {
    const cacheKey = `${item.voiceName}:${item.text}`;
    if (blobCache.has(cacheKey)) continue;
    if (precacheQueueKeys.has(cacheKey)) continue;
    newItems.push(item);
    precacheQueueKeys.add(cacheKey);
  }

  if (newItems.length > 0) {
    precacheQueue.unshift(...newItems);
  }

  if (!precacheWorkerRunning && precacheQueue.length > 0) {
    precacheWorkerRunning = true;
    processPrecacheQueue();
  }
}

async function processPrecacheQueue(): Promise<void> {
  while (precacheQueue.length > 0) {
    const item = precacheQueue.shift()!;
    const cacheKey = `${item.voiceName}:${item.text}`;
    precacheQueueKeys.delete(cacheKey);

    if (blobCache.has(cacheKey)) continue;

    // IndexedDBチェック
    try {
      const cached = await getAudioCache(cacheKey);
      if (cached) {
        blobCache.set(cacheKey, ttsResultToBlob({ data: cached.data, mimeType: cached.mimeType }));
        continue;
      }
    } catch { /* ignore */ }

    // クォータ枯渇中はAPI呼び出しをスキップ（429コンソールエラー防止）
    if (isTTSQuotaExhausted()) {
      precacheQueue.length = 0;
      precacheQueueKeys.clear();
      break;
    }

    // API取得
    try {
      const result = await callGeminiTTS(item.text, precacheApiKey, item.voiceName);
      blobCache.set(cacheKey, ttsResultToBlob(result));
      saveAudioCache({ key: cacheKey, data: result.data, mimeType: result.mimeType, createdAt: Date.now() }).catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('TTS_QUOTA_EXHAUSTED')) {
        precacheQueue.length = 0;
        precacheQueueKeys.clear();
        break;
      }
    }

    // レート制限回避
    await new Promise(r => setTimeout(r, 3_000));
  }
  precacheWorkerRunning = false;
}

