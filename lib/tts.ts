// TTS統合 (Gemini TTS + Web Speech API フォールバック)
// nano-storybook と同じアプローチ: Gemini優先、失敗時ブラウザTTSフォールバック
import { callGeminiTTS, ttsResultToBlob } from './gemini';

// iOS Safari対策: Audioオブジェクトを1つだけ作成し使い回す
let persistentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;
let isSpeakingNow = false;
let speechCancelId = 0; // 音声キャンセル用ID

// ブラウザTTS: 日本語音声をキャッシュ
let cachedJapaneseVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

// Gemini TTS: 音声キャッシュ (同じ単語の再生を高速化)
const audioCache = new Map<string, Blob>();
const MAX_CACHE_SIZE = 80;

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

  let blob = audioCache.get(cacheKey);
  if (!blob) {
    console.log(`🔊 Gemini TTS取得中: "${text.substring(0, 20)}..."`);
    const result = await callGeminiTTS(text, apiKey, voiceName);
    if (speechCancelId !== myId) return; // キャンセルされた
    blob = ttsResultToBlob(result);

    // キャッシュに保存
    if (audioCache.size >= MAX_CACHE_SIZE) {
      const firstKey = audioCache.keys().next().value;
      if (firstKey) audioCache.delete(firstKey);
    }
    audioCache.set(cacheKey, blob);
    console.log(`✅ Gemini TTS成功: "${text.substring(0, 20)}..."`);
  } else {
    console.log(`📦 キャッシュから再生: "${text.substring(0, 20)}..."`);
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

/** 複数テキストのGemini音声をキャッシュに先読み（厳密に1件ずつ逐次実行） */
export function prefetchAudio(texts: string[], apiKey: string | null, voiceName: string = 'Aoede'): void {
  if (!apiKey || texts.length === 0) return;

  // キャッシュ済みを除外
  const uncached = texts.filter(t => !audioCache.has(`${voiceName}:${t}`));
  if (uncached.length === 0) return;

  let i = 0;
  const fetchNext = () => {
    if (i >= uncached.length) return;
    const text = uncached[i++];

    callGeminiTTS(text, apiKey, voiceName)
      .then(result => {
        const blob = ttsResultToBlob(result);
        if (audioCache.size >= MAX_CACHE_SIZE) {
          const firstKey = audioCache.keys().next().value;
          if (firstKey) audioCache.delete(firstKey);
        }
        audioCache.set(`${voiceName}:${text}`, blob);
        console.log(`📦 先読み完了: "${text.substring(0, 20)}..."`);
      })
      .catch(e => {
        console.warn(`⚠️ 先読み失敗: "${text.substring(0, 20)}..."`, e.message);
      })
      .finally(() => {
        // 429回避: 次のリクエストまで2秒待つ
        setTimeout(fetchNext, 2000);
      });
  };

  // 1件ずつ逐次実行（並列なし）
  fetchNext();
}
