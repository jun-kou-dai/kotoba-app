// 学習エンジン (出題/判定/習得度)
import { VocabularyItem, ThemeId, LearningMode } from '../types/vocabulary';
import { MasteryStatus, SessionAnswer, LearningSession } from '../types/learning';
import { getVocabByTheme, vocabulary } from '../data/vocabulary';
import { updateMastery, saveSession, recordDaily } from './db';

/** 出題する語彙を選択。年齢の難易度上限(maxLevel)で絞り、問題数だけ返す */
export function selectQuestions(
  themeId: ThemeId,
  _mode: LearningMode,
  masteries: MasteryStatus[],
  maxLevel: number = 3,
  questionCount: number = 10,
): VocabularyItem[] {
  // 年齢の難易度上限で出題語を絞る。問題数に満たなければ上限を緩める（フォールバック）
  let themeVocab = getVocabByTheme(themeId).filter(v => v.level <= maxLevel);
  if (themeVocab.length < questionCount) themeVocab = getVocabByTheme(themeId);
  const masteryMap = new Map(masteries.map(m => [m.vocabId, m]));

  // 優先順: 未学習 > 苦手(masteryLevel 1) > ランダム
  const unlearned = themeVocab.filter(v => !masteryMap.has(v.id));
  const weak = themeVocab.filter(v => masteryMap.get(v.id)?.masteryLevel === 1);
  const rest = themeVocab.filter(v => {
    const m = masteryMap.get(v.id);
    return m && m.masteryLevel > 1;
  });

  const pool = [...shuffle(unlearned), ...shuffle(weak), ...shuffle(rest)];
  return pool.slice(0, questionCount);
}

/** 不正解の選択肢を生成（maxLevel以下から。足りなければ全レベルに緩和） */
export function generateDistractors(
  correctItem: VocabularyItem,
  count: number = 3,
  sameTheme: boolean = true,
  maxLevel: number = 3,
): VocabularyItem[] {
  const base = sameTheme
    ? vocabulary.filter(v => v.themeId === correctItem.themeId && v.id !== correctItem.id)
    : vocabulary.filter(v => v.id !== correctItem.id);
  let pool = base.filter(v => v.level <= maxLevel);
  if (pool.length < count) pool = base;
  return shuffle(pool).slice(0, count);
}

/** なかまわけ用: テーマの正解アイテムとダミーを生成（maxLevel以下から。足りなければ緩和） */
export function generateNakamawakeChoices(
  targetThemeId: ThemeId,
  correctCount: number = 3,
  distractorCount: number = 3,
  maxLevel: number = 3,
): { choices: VocabularyItem[]; correctIds: string[] } {
  const pick = (all: VocabularyItem[], n: number) => {
    const filtered = all.filter(v => v.level <= maxLevel);
    return shuffle(filtered.length >= n ? filtered : all).slice(0, n);
  };
  const themeItems = pick(vocabulary.filter(v => v.themeId === targetThemeId), correctCount);
  const otherItems = pick(vocabulary.filter(v => v.themeId !== targetThemeId), distractorCount);
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

  // 各問題の習得度を更新（みるモードは「見るだけ」の学習なので習得度は変えない）
  if (mode !== 'miru') {
    for (const answer of answers) {
      await updateMastery(childId, answer.vocabId, answer.isCorrect);
    }
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
