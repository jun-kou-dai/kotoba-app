import { LearningSession, calculateStars } from '../types/learning';

/** ごほうび（シール）図鑑のスタンプ一覧。クリアするごとに前から順に集まる。 */
export const STICKERS = [
  '🌟', '🍓', '🚀', '🌈', '🦄', '🍦',
  '🎈', '🐢', '🌸', '⚽', '🎵', '🍩',
  '🦋', '🌻', '🍪', '🐬', '🎨', '🍉',
  '🧁', '🦖',
];

/** ごほうび対象のセッションか。みるモードは対象外。クイズで星2つ（6割以上正解）＝クリア扱い。 */
export function isRewardSession(
  s: Pick<LearningSession, 'mode' | 'correctCount' | 'totalQuestions'>,
): boolean {
  if (s.mode === 'miru') return false;
  if (s.totalQuestions <= 0) return false;
  return calculateStars(s.correctCount, s.totalQuestions) >= 2;
}

/** 集めたシール数（対象セッション数。上限は STICKERS 数） */
export function countEarnedStickers(sessions: LearningSession[]): number {
  return Math.min(sessions.filter(isRewardSession).length, STICKERS.length);
}
