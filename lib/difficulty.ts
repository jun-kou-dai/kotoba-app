// 年齢別の難易度設定（#3）。設定画面を増やさず、プロフィールの年齢から自動導出する。
import { ChildProfile } from '../types/profile';

export interface DifficultyConfig {
  /** えらぶ・きくの選択肢数（正解を含む） */
  choices: number;
  /** なかまわけの総枚数 */
  nakamawakeTotal: number;
  /** なかまわけの正解数 */
  nakamawakeCorrect: number;
  /** 1セッションの問題数 */
  questionCount: number;
  /** 出題する語彙の最大レベル（これ以下のlevelだけを出す） */
  maxLevel: 1 | 2 | 3;
}

/** 年齢→難易度の対応表（語彙数 Lv1=5/Lv1+2=8/全=10 と問題数が噛み合う値） */
const TABLE: Record<ChildProfile['age'], DifficultyConfig> = {
  2: { choices: 2, nakamawakeTotal: 4, nakamawakeCorrect: 2, questionCount: 5, maxLevel: 1 },
  3: { choices: 3, nakamawakeTotal: 4, nakamawakeCorrect: 2, questionCount: 6, maxLevel: 2 },
  4: { choices: 4, nakamawakeTotal: 6, nakamawakeCorrect: 3, questionCount: 8, maxLevel: 2 },
  5: { choices: 4, nakamawakeTotal: 6, nakamawakeCorrect: 3, questionCount: 10, maxLevel: 3 },
};

/** 年齢から難易度設定を返す。不正な年齢が来た場合は4歳相当にフォールバック。 */
export function difficultyForAge(age: ChildProfile['age']): DifficultyConfig {
  return TABLE[age] ?? TABLE[4];
}
