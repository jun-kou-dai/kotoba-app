import { ThemeId, LearningMode } from './vocabulary';

/** 1問の回答記録 */
export interface SessionAnswer {
  questionIndex: number;
  vocabId: string;
  isCorrect: boolean;
  selectedId?: string;
  responseTimeMs: number;
  timestamp: string;
}

/** 学習セッション = 1回の学習 */
export interface LearningSession {
  id: string;
  childId: string;
  themeId: ThemeId;
  mode: LearningMode;
  answers: SessionAnswer[];
  totalQuestions: number;
  correctCount: number;
  startedAt: string;
  completedAt: string;
}

/** 1語の習得度 */
export interface MasteryStatus {
  vocabId: string;
  childId: string;
  correctCount: number;
  totalCount: number;
  lastAnsweredAt: string;
  masteryLevel: 0 | 1 | 2 | 3;
}

/** 日別学習記録 */
export interface DailyRecord {
  date: string;
  childId: string;
  sessionCount: number;
}

/** 習得レベル計算 */
export function calcMasteryLevel(correctCount: number, totalCount: number): 0 | 1 | 2 | 3 {
  if (totalCount === 0) return 0;
  const rate = correctCount / totalCount;
  if (rate >= 0.9 && totalCount >= 3) return 3;
  if (rate >= 0.6) return 2;
  return 1;
}

/** 星評価計算 */
export function calculateStars(correctCount: number, totalCount: number): 1 | 2 | 3 {
  if (totalCount === 0) return 1;
  const rate = correctCount / totalCount;
  if (rate >= 0.9) return 3;
  if (rate >= 0.6) return 2;
  return 1;
}
