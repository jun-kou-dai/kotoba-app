// 学習エンジン (出題/判定/習得度)
import { VocabularyItem, ThemeId, LearningMode } from '../types/vocabulary';
import { MasteryStatus, SessionAnswer, LearningSession } from '../types/learning';
import { getVocabByTheme, vocabulary } from '../data/vocabulary';
import { updateMastery, saveSession, recordDaily } from './db';

/** 出題する語彙を選択 (10問) */
export function selectQuestions(
  themeId: ThemeId,
  _mode: LearningMode,
  masteries: MasteryStatus[],
): VocabularyItem[] {
  const themeVocab = getVocabByTheme(themeId);
  const masteryMap = new Map(masteries.map(m => [m.vocabId, m]));

  // 優先順: 未学習 > 苦手(level 1) > ランダム
  const unlearned = themeVocab.filter(v => !masteryMap.has(v.id));
  const weak = themeVocab.filter(v => masteryMap.get(v.id)?.masteryLevel === 1);
  const rest = themeVocab.filter(v => {
    const m = masteryMap.get(v.id);
    return m && m.masteryLevel > 1;
  });

  const pool = [...shuffle(unlearned), ...shuffle(weak), ...shuffle(rest)];
  return pool.slice(0, 10);
}

/** 不正解の選択肢を生成 */
export function generateDistractors(
  correctItem: VocabularyItem,
  count: number = 3,
  sameTheme: boolean = true,
): VocabularyItem[] {
  const pool = sameTheme
    ? vocabulary.filter(v => v.themeId === correctItem.themeId && v.id !== correctItem.id)
    : vocabulary.filter(v => v.id !== correctItem.id);
  return shuffle(pool).slice(0, count);
}

/** なかまわけ用: テーマの正解アイテムとダミーを生成 */
export function generateNakamawakeChoices(
  targetThemeId: ThemeId,
  correctCount: number = 3,
  distractorCount: number = 3,
): { choices: VocabularyItem[]; correctIds: string[] } {
  const themeItems = shuffle(vocabulary.filter(v => v.themeId === targetThemeId)).slice(0, correctCount);
  const otherItems = shuffle(vocabulary.filter(v => v.themeId !== targetThemeId)).slice(0, distractorCount);
  const choices = shuffle([...themeItems, ...otherItems]);
  return {
    choices,
    correctIds: themeItems.map(v => v.id),
  };
}

/** セッション完了時の処理 */
export async function processSessionResults(
  childId: string,
  themeId: ThemeId,
  mode: LearningMode,
  answers: SessionAnswer[],
  startedAt: string,
): Promise<LearningSession> {
  const session: LearningSession = {
    id: crypto.randomUUID(),
    childId,
    themeId,
    mode,
    answers,
    totalQuestions: answers.length,
    correctCount: answers.filter(a => a.isCorrect).length,
    startedAt,
    completedAt: new Date().toISOString(),
  };

  await saveSession(session);
  await recordDaily(childId);

  // 各問題の習得度を更新
  for (const answer of answers) {
    await updateMastery(childId, answer.vocabId, answer.isCorrect);
  }

  return session;
}

/** 配列シャッフル */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
