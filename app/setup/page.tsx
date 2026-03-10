'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../contexts/AppContext';
import { validateApiKey } from '../../lib/gemini';
import BigButton from '../../components/ui/BigButton';

export default function SetupPage() {
  const router = useRouter();
  const { updateSettings } = useApp();
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleValidate = async () => {
    if (!apiKey.trim()) return;
    setStatus('checking');
    try {
      await validateApiKey(apiKey.trim());
      setStatus('success');
      updateSettings({ apiKey: apiKey.trim(), setupCompleted: true });
      setTimeout(() => router.push('/profile/new'), 800);
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'エラーが発生しました');
    }
  };

  const handleSkip = () => {
    updateSettings({ apiKey: '', setupCompleted: true });
    router.push('/profile/new');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10">
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">🔑</div>
        <h1 className="text-3xl font-extrabold text-gray-800">はじめの せってい</h1>
        <p className="text-gray-500 mt-2">おとなの ひとが せっていしてね</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-lg font-bold text-gray-700 mb-2">Gemini API キー</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setStatus('idle'); }}
            placeholder="AIza..."
            className="w-full bg-white rounded-xl px-4 py-4 text-lg border-2 border-gray-200 focus:border-green-400 outline-none"
          />
        </div>

        {status === 'error' && (
          <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-base">{errorMsg}</div>
        )}
        {status === 'success' && (
          <div className="bg-green-50 text-green-600 rounded-xl px-4 py-3 text-base">せつぞく せいこう！</div>
        )}

        <BigButton onClick={handleValidate} disabled={!apiKey.trim() || status === 'checking'}>
          {status === 'checking' ? 'かくにんちゅう...' : 'つかってみる'}
        </BigButton>

        <button onClick={handleSkip} className="w-full text-center text-gray-400 py-3 text-base">
          あとで せっていする（おんせいが ブラウザよみあげに なります）
        </button>
      </div>
    </div>
  );
}
