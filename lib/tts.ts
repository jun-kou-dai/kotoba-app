// TTS統合 (Gemini TTS + Web Speech API フォールバック)
// nano-storybook と同じアプローチ: Gemini優先、失敗時ブラウザTTSフォールバック
import { callGeminiTTS, ttsResultToBlob } from './gemini';
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

export function initAudioContext(): void {
  getOrCreateAudio();
  preloadVoices();
}

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
      console.log(`📦 IndexedDBキャッシュから再生: "${text.substring(0, 20)}..."`);
    }
  } else {
    console.log(`📦 メモリキャッシュから再生: "${text.substring(0, 20)}..."`);
  }
  if (!blob) {
    console.log(`🔊 Gemini TTS取得中: "${text.substring(0, 20)}..."`);
    const result = await callGeminiTTS(text, apiKey, voiceName);
    if (speechCancelId !== myId) return;
    blob = ttsResultToBlob(result);
    blobCache.set(cacheKey, blob);
    // IndexedDBに永続保存（バックグラウンド、エラーは無視）
    saveAudioCache({ key: cacheKey, data: result.data, mimeType: result.mimeType, createdAt: Date.now() }).catch(() => {});
    console.log(`✅ Gemini TTS成功+キャッシュ保存: "${text.substring(0, 20)}..."`);
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
      console.warn('Gemini音声再生エラー、ブラウザTTSにフォールバック');
      playBrowserTTS(text, speed).then(resolve);
    };
    audio.play().catch(() => {
      if (currentAudioUrl === url) {
        URL.revokeObjectURL(url);
        currentAudioUrl = null;
      }
      isSpeakingNow = false;
      console.warn('Gemini音声play()失敗、ブラウザTTSにフォールバック');
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
  stopSpeaking();

  // Gemini TTS優先（nano-storybookと同じ）
  if (apiKey) {
    try {
      await playGeminiAudio(text, apiKey, voiceName, speed);
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      console.warn('Gemini TTS error, ブラウザTTSにフォールバック:', msg);
      if (msg.includes('APIキーが無効')) throw e;
      // フォールバックへ
    }
  }
  await playBrowserTTS(text, speed);
}

/**
 * バックグラウンドで単語リストの音声をプリキャッシュする。
 * キャッシュ済みの単語はスキップし、未キャッシュのみAPI呼び出し。
 * レート制限回避のため6秒間隔で逐次実行（10RPM以内）。
 */
let precacheAbortController: AbortController | null = null;

export function precacheAudio(
  words: { text: string; voiceName: string }[],
  apiKey: string,
): void {
  // 前回のプリキャッシュを中止
  if (precacheAbortController) {
    precacheAbortController.abort();
  }
  const controller = new AbortController();
  precacheAbortController = controller;

  (async () => {
    for (const { text, voiceName } of words) {
      if (controller.signal.aborted) return;
      const cacheKey = `${voiceName}:${text}`;

      // メモリキャッシュにあればスキップ
      if (blobCache.has(cacheKey)) continue;

      // IndexedDBキャッシュにあればメモリに読み込んでスキップ
      try {
        const cached = await getAudioCache(cacheKey);
        if (cached) {
          blobCache.set(cacheKey, ttsResultToBlob({ data: cached.data, mimeType: cached.mimeType }));
          continue;
        }
      } catch { /* ignore */ }

      if (controller.signal.aborted) return;

      // APIからTTS取得 → キャッシュ保存
      try {
        const result = await callGeminiTTS(text, apiKey, voiceName);
        if (controller.signal.aborted) return;
        blobCache.set(cacheKey, ttsResultToBlob(result));
        saveAudioCache({ key: cacheKey, data: result.data, mimeType: result.mimeType, createdAt: Date.now() }).catch(() => {});
        console.log(`🔄 プリキャッシュ完了: "${text}"`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('TTS_QUOTA_EXHAUSTED')) {
          console.warn('🔄 プリキャッシュ中止: クォータ枯渇');
          return;
        }
        console.warn(`🔄 プリキャッシュ失敗: "${text}" - ${msg}`);
      }

      if (controller.signal.aborted) return;
      // レート制限回避: 3秒間隔（429 RATE時は自動15秒待機で自己調整）
      await new Promise(r => setTimeout(r, 3_000));
    }
  })();
}

