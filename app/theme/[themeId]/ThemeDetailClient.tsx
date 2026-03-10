'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../contexts/AppContext';
import { getMasteryByChild } from '../../../lib/db';
import { MasteryStatus } from '../../../types/learning';
import { getThemeById } from '../../../data/themes';
import { getVocabByTheme } from '../../../data/vocabulary';
import { LearningMode, ThemeId } from '../../../types/vocabulary';
import BackButton from '../../../components/ui/BackButton';
import VocabCard from '../../../components/VocabCard';
import BigButton from '../../../components/ui/BigButton';
import ProgressBar from '../../../components/ui/ProgressBar';
import { speakText, prefetchAudio } from '../../../lib/tts';

const MODES: { id: LearningMode; emoji: string; name: string; desc: string }[] = [
  { id: 'miru', emoji: '👀', name: 'みる', desc: 'カードを みてみよう' },
  { id: 'kiku', emoji: '👂', name: 'きく', desc: 'おとを きいて えらぼう' },
  { id: 'erabu', emoji: '👆', name: 'えらぶ', desc: 'ただしいのを えらぼう' },
  { id: 'nakamawake', emoji: '📦', name: 'なかまわけ', desc: 'なかまを あつめよう' },
];

export default function ThemeDetailClient({ themeId }: { themeId: string }) {
  const router = useRouter();
  const { currentChild, isLoading, settings } = useApp();
  const [masteries, setMasteries] = useState<MasteryStatus[]>([]);

  const theme = getThemeById(themeId);
  const vocabItems = getVocabByTheme(themeId as ThemeId);

  useEffect(() => {
    if (isLoading) return;
    if (!currentChild) { router.replace('/'); return; }
    getMasteryByChild(currentChild.id).then(setMasteries);

    // テーマ詳細表示時に全モードの音声をGeminiで先読み
    // ユーザーがモードを選ぶまでの間にキャッシュを温める
    if (settings.voiceEnabled && settings.apiKey && vocabItems.length > 0) {
      const texts: string[] = [];
      // みるモード用: 単語のみ
      vocabItems.forEach(v => texts.push(v.ttsText || v.word));
      // きくモード用: 「〜は どれかな？」
      vocabItems.forEach(v => texts.push(`${v.ttsText || v.word}は どれかな？`));
      // なかまわけモード用: 「テーマ名は どれ？」
      if (theme) texts.push(`${theme.name}は どれ？`);
      prefetchAudio(texts, settings.apiKey, settings.voiceName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChild, isLoading, router, themeId]);

  if (!theme) return <div className="p-6 text-center">テーマが みつかりません</div>;

  const masteredCount = vocabItems.filter(v =>
    masteries.find(m => m.vocabId === v.id && m.masteryLevel >= 3)
  ).length;

  return (
    <div className="min-h-screen px-4 py-4">
      <BackButton />

      {/* テーマヘッダー */}
      <div className={`bg-gradient-to-br ${theme.color} rounded-3xl p-6 text-white mb-6`}>
        <div className="text-5xl mb-2">{theme.emoji}</div>
        <h1 className="text-3xl font-extrabold">{theme.name}</h1>
        <p className="opacity-90 mt-1">{theme.description}</p>
        <div className="mt-3 flex items-center gap-2">
          <ProgressBar current={masteredCount} total={vocabItems.length} className="flex-1" />
          <span className="text-sm font-bold">{masteredCount}/{vocabItems.length}</span>
        </div>
      </div>

      {/* ことばカード一覧 */}
      <div className="mb-6">
        <h2 className="text-lg font-extrabold mb-3">ことば</h2>
        <div className="grid grid-cols-3 gap-3">
          {vocabItems.map(item => {
            const m = masteries.find(ms => ms.vocabId === item.id);
            return <VocabCard key={item.id} item={item} masteryLevel={m?.masteryLevel} size="sm" onClick={() => {
              if (settings.voiceEnabled) {
                speakText(item.ttsText || item.word, settings.apiKey || null, settings.voiceName, settings.voiceSpeed, true).catch(() => {});
              }
            }} />;
          })}
        </div>
      </div>

      {/* 学習モード選択 */}
      <div>
        <h2 className="text-lg font-extrabold mb-3">おべんきょう する</h2>
        <div className="space-y-3">
          {MODES.map(mode => (
            <BigButton
              key={mode.id}
              variant="secondary"
              onClick={() => router.push(`/learn/${themeId}/${mode.id}`)}
              className="text-left"
            >
              <div className="flex items-center gap-3 px-2">
                <span className="text-3xl">{mode.emoji}</span>
                <div>
                  <div className="text-xl font-extrabold">{mode.name}</div>
                  <div className="text-sm text-gray-400 font-normal">{mode.desc}</div>
                </div>
              </div>
            </BigButton>
          ))}
        </div>
      </div>
    </div>
  );
}
