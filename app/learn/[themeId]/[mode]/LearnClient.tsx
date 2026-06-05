'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../../contexts/AppContext';
import { getMasteryByChild, getSessionsByChild } from '../../../../lib/db';
import { selectQuestions, processSessionResults } from '../../../../lib/learning-engine';
import { difficultyForAge } from '../../../../lib/difficulty';
import { countEarnedStickers } from '../../../../data/rewards';
import { MasteryStatus, SessionAnswer } from '../../../../types/learning';
import { ThemeId, LearningMode, VocabularyItem } from '../../../../types/vocabulary';
import { getThemeById } from '../../../../data/themes';
// 音声はオンデマンドで取得（nano-storybookと同じアプローチ）
import BackButton from '../../../../components/ui/BackButton';
import ProgressBar from '../../../../components/ui/ProgressBar';
import MiruMode from '../../../../components/learn/MiruMode';
import KikuMode from '../../../../components/learn/KikuMode';
import ErabuMode from '../../../../components/learn/ErabuMode';
import NakamawakeMode from '../../../../components/learn/NakamawakeMode';

const MODE_LABELS: Record<LearningMode, string> = {
  miru: 'みる',
  kiku: 'きく',
  erabu: 'えらぶ',
  nakamawake: 'なかまわけ',
};

export default function LearnClient({ themeId, mode }: { themeId: string; mode: string }) {
  const router = useRouter();
  const { currentChild, isLoading, settings } = useApp();
  const [questions, setQuestions] = useState<VocabularyItem[]>([]);
  const [startedAt] = useState(new Date().toISOString());
  const [isReady, setIsReady] = useState(false);

  const theme = getThemeById(themeId);
  const learningMode = mode as LearningMode;
  // 年齢から難易度を導出（選択肢数・なかまわけ枚数・問題数・出題レベル）
  const difficulty = difficultyForAge(currentChild?.age ?? 4);

  useEffect(() => {
    if (isLoading) return;
    if (!currentChild) { router.replace('/'); return; }
    const diff = difficultyForAge(currentChild.age);
    getMasteryByChild(currentChild.id).then((masteries: MasteryStatus[]) => {
      const qs = selectQuestions(themeId as ThemeId, learningMode, masteries, diff.maxLevel, diff.questionCount);
      setQuestions(qs);
      setIsReady(true);
    });
  }, [currentChild, isLoading, themeId, learningMode, router]);

  const handleComplete = useCallback(async (answers: SessionAnswer[]) => {
    if (!currentChild) return;
    const session = await processSessionResults(
      currentChild.id,
      themeId as ThemeId,
      learningMode,
      answers,
      startedAt,
    );
    // 結果画面へ
    const params = new URLSearchParams({
      sessionId: session.id,
      correct: String(session.correctCount),
      total: String(session.totalQuestions),
      themeId,
      mode,
    });
    // ごほうび: 今回のクリアで新しくシールが増えた時だけ、そのindexをURLで渡す（確定値・1回限り）
    const sessions = await getSessionsByChild(currentChild.id);
    const countAfter = countEarnedStickers(sessions);
    const countBefore = countEarnedStickers(sessions.filter(s => s.id !== session.id));
    if (countAfter > countBefore) {
      params.set('earned', String(countAfter - 1));
    }
    router.push(`/result?${params.toString()}`);
  }, [currentChild, themeId, learningMode, startedAt, router, mode]);

  if (!theme || !isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-3xl animate-bounce">📚</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4">
      {/* ヘッダー */}
      <div className="px-4 flex items-center gap-3 mb-2">
        <BackButton />
        <span className="text-lg font-extrabold text-gray-600">{MODE_LABELS[learningMode]}</span>
        <div className="flex-1">
          <ProgressBar current={0} total={questions.length} />
        </div>
      </div>

      {/* モード別コンテンツ */}
      {learningMode === 'miru' && (
        <MiruMode questions={questions} onComplete={handleComplete} />
      )}
      {learningMode === 'kiku' && (
        <KikuMode questions={questions} onComplete={handleComplete} choices={difficulty.choices} maxLevel={difficulty.maxLevel} />
      )}
      {learningMode === 'erabu' && (
        <ErabuMode questions={questions} onComplete={handleComplete} choices={difficulty.choices} maxLevel={difficulty.maxLevel} />
      )}
      {learningMode === 'nakamawake' && (
        <NakamawakeMode themeId={themeId as ThemeId} questionCount={difficulty.questionCount} correctCount={difficulty.nakamawakeCorrect} total={difficulty.nakamawakeTotal} maxLevel={difficulty.maxLevel} onComplete={handleComplete} />
      )}
    </div>
  );
}
