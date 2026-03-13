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
    if (res.status === 400 && msg.toLowerCase().includes('api key')) throw new Error('APIキーが無効です。');
    if (res.status === 404) throw new Error(`モデル "${model}" が見つかりません。`);
    if (res.status === 429) {
      // TTS側でクォータ枯渇vsレート制限を区別するため原文を含める
      const isQuota = msg.toLowerCase().includes('quota') || msg.includes('per_day');
      throw new Error(isQuota ? 'API_429_QUOTA' : 'API_429_RATE');
    }
    if (res.status >= 500) throw new Error('Googleサーバーエラーです。');
    throw new Error(`APIエラー: ${msg}`);
  }
  return await res.json() as Record<string, unknown>;
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  let data: Record<string, unknown>;
  try {
    data = await geminiRequest('gemini-2.5-flash', 'generateContent', {
      contents: [{ role: 'user', parts: [{ text: 'Say "OK" in one word.' }] }],
    }, apiKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.startsWith('API_429')) throw new Error('API制限に達しました。しばらく待ってください。');
    throw e;
  }
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

  let quotaExhaustedCount = 0;

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
        // 音声データなし（finishReason: OTHER）→ リトライ（短い単語で発生しやすい）
        if (retry < 2) {
          console.warn(`⚠️ ${model} 音声データなし（試行${retry + 1}）→ リトライ`);
          await new Promise(r => setTimeout(r, 1_000));
          continue;
        }
        console.warn(`⚠️ ${model} 音声データなし（3回失敗）→ 次のモデルへ`);
        break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('ネットワーク') || msg.includes('APIキーが無効')) throw e;
        // 日次クォータ枯渇: このモデルはスキップして次のモデルへ
        if (msg === 'API_429_QUOTA') {
          quotaExhaustedCount++;
          console.warn(`🔇 ${model} 日次クォータ枯渇 → 次のモデルへ`);
          break;
        }
        // 一時的レート制限: 15秒リトライ1回だけ
        if (msg === 'API_429_RATE' && retry < 1) {
          console.log(`⏳ TTS レート制限、15秒待機... (${model})`);
          await new Promise(r => setTimeout(r, 15_000));
          continue;
        }
        break; // その他のエラー or リトライ上限 → 次のモデルへ
      }
    }
  }

  // 全モデルがクォータ枯渇ならフラグを立てる
  if (quotaExhaustedCount >= models.length) {
    ttsQuotaExhausted = true;
    throw new Error('TTS_QUOTA_EXHAUSTED');
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
