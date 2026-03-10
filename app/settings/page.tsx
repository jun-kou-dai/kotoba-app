'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../contexts/AppContext';
import { validateApiKey } from '../../lib/gemini';
import BackButton from '../../components/ui/BackButton';
import BigButton from '../../components/ui/BigButton';

const VOICE_OPTIONS = [
  { id: 'Aoede', name: 'やさしい 🌸' },
  { id: 'Kore', name: 'あかるい 🍀' },
  { id: 'Puck', name: 'げんき ⭐' },
  { id: 'Charon', name: 'おちついた 🌙' },
  { id: 'Fenrir', name: 'ちからづよい 🐺' },
];

const SPEED_OPTIONS = [
  { value: 0.7, label: '🐌 とても ゆっくり' },
  { value: 0.85, label: '🐢 ゆっくり' },
  { value: 1.0, label: '🚶 ふつう' },
  { value: 1.2, label: '🐇 すこし はやい' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings } = useApp();
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [checking, setChecking] = useState(false);
  const [apiStatus, setApiStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleApiKeySave = async () => {
    if (!apiKey.trim()) {
      updateSettings({ apiKey: '' });
      return;
    }
    setChecking(true);
    try {
      await validateApiKey(apiKey.trim());
      updateSettings({ apiKey: apiKey.trim() });
      setApiStatus('success');
    } catch {
      setApiStatus('error');
    }
    setChecking(false);
  };

  return (
    <div className="min-h-screen px-4 py-4">
      <BackButton label="せってい" />

      <div className="space-y-6 mt-4">
        {/* APIキー */}
        <section className="bg-white rounded-2xl p-5 shadow-md">
          <h2 className="text-lg font-extrabold mb-3">API キー</h2>
          <input
            type="password"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setApiStatus('idle'); }}
            placeholder="Gemini API キー"
            className="w-full bg-gray-50 rounded-xl px-4 py-3 border-2 border-gray-200 focus:border-green-400 outline-none mb-3"
          />
          <BigButton onClick={handleApiKeySave} disabled={checking} variant="secondary">
            {checking ? 'かくにんちゅう...' : 'ほぞん'}
          </BigButton>
          {apiStatus === 'success' && <div className="text-green-500 text-sm mt-2">せつぞく OK</div>}
          {apiStatus === 'error' && <div className="text-red-500 text-sm mt-2">APIキー が むこうです</div>}
        </section>

        {/* 音声 */}
        <section className="bg-white rounded-2xl p-5 shadow-md">
          <h2 className="text-lg font-extrabold mb-3">おんせい</h2>

          <div className="flex items-center justify-between mb-4">
            <span className="font-bold">おんせい ON/OFF</span>
            <button
              onClick={() => updateSettings({ voiceEnabled: !settings.voiceEnabled })}
              className={`w-14 h-8 rounded-full transition-colors ${settings.voiceEnabled ? 'bg-green-400' : 'bg-gray-300'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform mx-1 ${settings.voiceEnabled ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          <div className="mb-4">
            <span className="font-bold block mb-2">こえの しゅるい</span>
            <div className="grid grid-cols-2 gap-2">
              {VOICE_OPTIONS.map(v => (
                <button
                  key={v.id}
                  onClick={() => updateSettings({ voiceName: v.id })}
                  className={`py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                    settings.voiceName === v.id ? 'bg-green-400 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="font-bold block mb-2">はやさ</span>
            <div className="space-y-2">
              {SPEED_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => updateSettings({ voiceSpeed: s.value })}
                  className={`w-full py-2 px-4 rounded-xl text-left text-sm font-bold transition-all ${
                    settings.voiceSpeed === s.value ? 'bg-green-400 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 効果音 */}
        <section className="bg-white rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-bold">こうかおん</span>
            <button
              onClick={() => updateSettings({ soundEffectsEnabled: !settings.soundEffectsEnabled })}
              className={`w-14 h-8 rounded-full transition-colors ${settings.soundEffectsEnabled ? 'bg-green-400' : 'bg-gray-300'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform mx-1 ${settings.soundEffectsEnabled ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </section>

        {/* プロフィール管理 */}
        <section className="bg-white rounded-2xl p-5 shadow-md">
          <h2 className="text-lg font-extrabold mb-3">プロフィール</h2>
          <BigButton variant="secondary" onClick={() => router.push('/profile')}>
            プロフィールを きりかえ
          </BigButton>
        </section>
      </div>
    </div>
  );
}
