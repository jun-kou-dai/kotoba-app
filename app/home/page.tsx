'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../contexts/AppContext';
import { getMasteryByChild, getDailyRecords, getStreak } from '../../lib/db';
import { MasteryStatus } from '../../types/learning';
import { themes } from '../../data/themes';
import { vocabulary } from '../../data/vocabulary';
import { ThemeId } from '../../types/vocabulary';
import ThemeCard from '../../components/ThemeCard';
import { initAudioContext } from '../../lib/tts';

export default function HomePage() {
  const router = useRouter();
  const { currentChild, isLoading, settings } = useApp();
  const [masteries, setMasteries] = useState<MasteryStatus[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (isLoading) return;
    if (!currentChild) { router.replace('/'); return; }
    getMasteryByChild(currentChild.id).then(setMasteries);
    getDailyRecords(currentChild.id).then(records => setStreak(getStreak(records)));
    // TTS音声リストのみプリロード（AudioContextはユーザー操作時に遅延作成）
    initAudioContext();
  }, [currentChild, isLoading, router]);

  const themeMasteryMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const theme of themes) {
      const themeVocab = vocabulary.filter(v => v.themeId === theme.id);
      const mastered = themeVocab.filter(v =>
        masteries.find(m => m.vocabId === v.id && m.masteryLevel >= 3)
      ).length;
      map[theme.id] = themeVocab.length > 0 ? mastered / themeVocab.length : 0;
    }
    return map;
  }, [masteries]);

  // 日替わりことば
  const todayWord = useMemo(() => {
    const dayIndex = new Date().getDate() % vocabulary.length;
    return vocabulary[dayIndex];
  }, []);

  if (!currentChild) return null;

  return (
    <div className="min-h-screen px-4 py-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{currentChild.avatarEmoji}</span>
          <div>
            <div className="text-xl font-extrabold">{currentChild.name}ちゃん</div>
            {streak > 0 && <div className="text-sm text-orange-500 font-bold">🔥 {streak}にち れんぞく！</div>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/history')} className="text-2xl p-2">📊</button>
          <button onClick={() => router.push('/settings')} className="text-2xl p-2">⚙️</button>
        </div>
      </div>

      {/* APIキー未設定の案内 */}
      {settings.voiceEnabled && !settings.apiKey && (
        <button
          onClick={() => router.push('/settings')}
          className="w-full bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-4 text-left active:scale-[0.98] transition-transform"
        >
          <div className="text-lg font-extrabold text-amber-700">🔊 こえの せってい</div>
          <div className="text-sm text-amber-600 mt-1">
            きれいな こえで よむには Gemini API キーが ひつようです。タップして せっていしてね
          </div>
        </button>
      )}

      {/* きょうのことば */}
      <div className="bg-white rounded-2xl p-5 shadow-md mb-6 text-center">
        <div className="text-sm text-gray-400 font-bold mb-1">きょうの ことば</div>
        <div className="text-6xl mb-2">{todayWord.emoji}</div>
        <div className="text-3xl font-extrabold">{todayWord.word}</div>
        {todayWord.hint && <div className="text-gray-400 mt-1">{todayWord.hint}</div>}
      </div>

      {/* テーマ一覧 */}
      <div className="mb-4">
        <h2 className="text-xl font-extrabold mb-3">テーマを えらぼう</h2>
        <div className="grid grid-cols-2 gap-4">
          {themes.map(theme => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              mastery={themeMasteryMap[theme.id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
