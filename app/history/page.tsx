'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../contexts/AppContext';
import { getMasteryByChild, getSessionsByChild, getDailyRecords, getStreak } from '../../lib/db';
import { MasteryStatus, LearningSession } from '../../types/learning';
import { themes } from '../../data/themes';
import { vocabulary } from '../../data/vocabulary';
import BackButton from '../../components/ui/BackButton';
import ProgressBar from '../../components/ui/ProgressBar';

const MODE_LABELS: Record<string, string> = {
  miru: 'みる',
  kiku: 'きく',
  erabu: 'えらぶ',
  nakamawake: 'なかまわけ',
};

export default function HistoryPage() {
  const router = useRouter();
  const { currentChild, isLoading } = useApp();
  const [masteries, setMasteries] = useState<MasteryStatus[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (isLoading) return;
    if (!currentChild) { router.replace('/'); return; }
    getMasteryByChild(currentChild.id).then(setMasteries);
    getSessionsByChild(currentChild.id).then(setSessions);
    getDailyRecords(currentChild.id).then(records => setStreak(getStreak(records)));
  }, [currentChild, isLoading, router]);

  const themeMasteries = useMemo(() => {
    return themes.map(theme => {
      const themeVocab = vocabulary.filter(v => v.themeId === theme.id);
      const mastered = themeVocab.filter(v =>
        masteries.find(m => m.vocabId === v.id && m.masteryLevel >= 3)
      ).length;
      return { theme, mastered, total: themeVocab.length };
    });
  }, [masteries]);

  const weakItems = useMemo(() => {
    return masteries
      .filter(m => m.totalCount >= 3 && m.correctCount / m.totalCount < 0.6)
      .sort((a, b) => (a.correctCount / a.totalCount) - (b.correctCount / b.totalCount))
      .slice(0, 5)
      .map(m => {
        const item = vocabulary.find(v => v.id === m.vocabId);
        return { mastery: m, item };
      })
      .filter(x => x.item);
  }, [masteries]);

  const recentSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 10);
  }, [sessions]);

  if (!currentChild) return null;

  return (
    <div className="min-h-screen px-4 py-4">
      <BackButton label="がくしゅうの きろく" />

      {/* まとめ */}
      <div className="bg-white rounded-2xl p-5 shadow-md mb-4 mt-4">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="text-3xl font-extrabold text-orange-500">🔥 {streak}</div>
            <div className="text-sm text-gray-400">れんぞく にっすう</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-extrabold text-blue-500">{sessions.length}</div>
            <div className="text-sm text-gray-400">そう がくしゅう</div>
          </div>
        </div>
      </div>

      {/* テーマ別習得度 */}
      <div className="bg-white rounded-2xl p-5 shadow-md mb-4">
        <h2 className="text-lg font-extrabold mb-3">テーマべつ しゅうとくど</h2>
        <div className="space-y-3">
          {themeMasteries.map(({ theme, mastered, total }) => (
            <div key={theme.id} className="flex items-center gap-3">
              <span className="text-2xl w-8">{theme.emoji}</span>
              <span className="text-base font-bold w-20">{theme.name}</span>
              <ProgressBar current={mastered} total={total} className="flex-1" />
              <span className="text-sm text-gray-400 w-14 text-right">{Math.round((mastered / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 苦手な単語 */}
      {weakItems.length > 0 && (
        <div className="bg-orange-50 rounded-2xl p-5 border-2 border-orange-100 mb-4">
          <h2 className="text-lg font-extrabold mb-3">にがてな ことば</h2>
          <div className="space-y-2">
            {weakItems.map(({ mastery, item }) => (
              <div key={mastery.vocabId} className="flex items-center gap-3">
                <span className="text-2xl">{item!.emoji}</span>
                <span className="font-bold flex-1">{item!.word}</span>
                <span className="text-sm text-gray-400">
                  {mastery.correctCount}/{mastery.totalCount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近の学習 */}
      <div className="bg-white rounded-2xl p-5 shadow-md">
        <h2 className="text-lg font-extrabold mb-3">さいきんの がくしゅう</h2>
        {recentSessions.length === 0 ? (
          <div className="text-gray-400 text-center py-4">まだ がくしゅうが ありません</div>
        ) : (
          <div className="space-y-2">
            {recentSessions.map(s => {
              const theme = themes.find(t => t.id === s.themeId);
              const date = new Date(s.completedAt);
              return (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-400 w-12">{date.getMonth() + 1}/{date.getDate()}</span>
                  <span className="text-lg">{theme?.emoji}</span>
                  <span className="font-bold flex-1">{MODE_LABELS[s.mode] || s.mode}</span>
                  <span className="font-bold text-green-500">{s.correctCount}/{s.totalQuestions}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
