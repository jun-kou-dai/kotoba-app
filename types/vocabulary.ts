/** 学習テーマID */
export type ThemeId = 'doubutsu' | 'tabemono' | 'iro' | 'norimono';

/** 学習モードID */
export type LearningMode = 'miru' | 'kiku' | 'erabu' | 'nakamawake';

/** テーマ定義 */
export interface Theme {
  id: ThemeId;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

/** 1語彙アイテム = 1カード1概念 */
export interface VocabularyItem {
  id: string;
  themeId: ThemeId;
  word: string;
  reading: string;
  emoji: string;
  imageUrl?: string;
  hint?: string;
  sortOrder: number;
}
