// TTS統合 (Gemini TTS + Web Speech API フォールバック)
import { callGeminiTTS, ttsResultToBlob } from './gemini';

// iOS Safari対策: Audioオブジェクトを1つだけ作成し使い回す
let persistentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;
let isSpeakingNow = false;

function getOrCreateAudio(): HTMLAudioElement {
  if (!persistentAudio) {
    persistentAudio = new Audio();
    persistentAudio.setAttribute('playsinline', '');
  }
  return persistentAudio;
}

export function initAudioContext(): void {
  getOrCreateAudio();
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

async function playGeminiTTS(text: string, apiKey: string, voiceName: string, speed: number): Promise<void> {
  const result = await callGeminiTTS(text, apiKey, voiceName);
  const blob = ttsResultToBlob(result);
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

function playBrowserTTS(text: string, speed: number): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = speed;
    isSpeakingNow = true;
    utterance.onend = () => { isSpeakingNow = false; resolve(); };
    utterance.onerror = () => { isSpeakingNow = false; resolve(); };
    window.speechSynthesis.speak(utterance);
  });
}

export async function speakText(
  text: string,
  apiKey: string | null,
  voiceName: string = 'Aoede',
  speed: number = 0.85,
): Promise<void> {
  stopSpeaking();

  if (apiKey) {
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
