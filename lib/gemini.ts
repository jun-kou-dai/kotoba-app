// Gemini API呼び出し基盤 (Nano Storybook gemini.js を TypeScript移植)
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function geminiRequest(model: string, action: string, body: object, apiKey: string): Promise<Record<string, unknown>> {
  const url = `${API_BASE}/${model}:${action}?key=${apiKey}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('ネットワーク接続エラーです。');
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
    const msg = errBody.error?.message || `HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) throw new Error('APIキーが無効です。');
    if (res.status === 404) throw new Error(`モデル "${model}" が見つかりません。`);
    if (res.status === 429) throw new Error('API制限に達しました。しばらく待ってください。');
    if (res.status >= 500) throw new Error('Googleサーバーエラーです。');
    throw new Error(`APIエラー: ${msg}`);
  }
  return await res.json() as Record<string, unknown>;
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  const data = await geminiRequest('gemini-2.5-flash', 'generateContent', {
    contents: [{ role: 'user', parts: [{ text: 'Say "OK" in one word.' }] }],
  }, apiKey);
  const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  const text = candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('APIからの応答が空です');
  return true;
}

// === TTS ===
const TTS_MODELS = [
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro-preview-tts',
];
let workingTTSModel: string | null = null;
let ttsQuotaExhausted = false;

export function resetTTSQuota(): void {
  ttsQuotaExhausted = false;
  workingTTSModel = null;
}

interface TTSResult {
  data: string;
  mimeType: string;
}

export async function callGeminiTTS(text: string, apiKey: string, voiceName: string = 'Aoede'): Promise<TTSResult> {
  if (ttsQuotaExhausted) {
    throw new Error('TTS_QUOTA_EXHAUSTED');
  }

  const ttsBody = {
    contents: [{ role: 'user', parts: [{ text: `次の文章を読んでください：\n\n${text}` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }
        }
      }
    }
  };

  // nano-storybook方式: 成功実績モデル優先、両モデルを順に試す
  const models = workingTTSModel
    ? [workingTTSModel, ...TTS_MODELS.filter(m => m !== workingTTSModel)]
    : TTS_MODELS;

  for (const model of models) {
    for (let retry = 0; retry < 3; retry++) {
      try {
        const data = await geminiRequest(model, 'generateContent', ttsBody, apiKey);
        const candidates = data.candidates as Array<{ content?: { parts?: Array<{ inlineData?: { data: string; mimeType: string } }> } }> | undefined;
        const parts = candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            workingTTSModel = model;
            return { data: part.inlineData.data, mimeType: part.inlineData.mimeType || 'audio/L16;rate=24000' };
          }
        }
        break; // レスポンスはあったが音声データなし → 次のモデルへ
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('ネットワーク') || msg.includes('APIキーが無効')) throw e;
        if (msg.includes('limit: 0') || (msg.includes('quota') && msg.includes('exceeded'))) {
          ttsQuotaExhausted = true;
          throw new Error('TTS_QUOTA_EXHAUSTED');
        }
        // 429: 15秒→30秒リトライ（nano-storybook方式）
        if ((msg.includes('429') || msg.includes('rate') || msg.includes('制限')) && retry < 2) {
          const wait = (retry + 1) * 15_000;
          console.log(`⏳ TTS レート制限、${wait / 1000}秒待機... (${model}, retry ${retry + 1})`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        break; // その他のエラー → 次のモデルへ
      }
    }
  }
  throw new Error('TTS応答にオーディオデータがありません');
}

// PCM→WAV変換
export function createWavFromPcm(pcmBase64: string): Blob {
  const binaryString = atob(pcmBase64);
  const pcmData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pcmData[i] = binaryString.charCodeAt(i);
  }
  const pcmLength = pcmData.length;
  const wavBuffer = new ArrayBuffer(44 + pcmLength);
  const view = new DataView(wavBuffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcmLength, true);
  const wavUint8 = new Uint8Array(wavBuffer);
  wavUint8.set(pcmData, 44);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

export function ttsResultToBlob(ttsResult: TTSResult): Blob {
  const { data, mimeType } = ttsResult;
  if (mimeType.startsWith('audio/wav') || mimeType.startsWith('audio/mpeg') ||
      mimeType.startsWith('audio/mp3') || mimeType.startsWith('audio/ogg')) {
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return new Blob([bytes], { type: mimeType.split(';')[0] });
  }
  return createWavFromPcm(data);
}
