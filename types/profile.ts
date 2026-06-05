/** 子どもプロフィール */
export interface ChildProfile {
  id: string;
  name: string;
  age: 2 | 3 | 4 | 5;
  gender: 'boy' | 'girl' | '';
  avatarEmoji: string;
  createdAt: string;
  updatedAt: string;
}

/** アバター選択肢 */
export const AVATAR_OPTIONS = [
  { emoji: '🐶', label: 'いぬ' },
  { emoji: '🐱', label: 'ねこ' },
  { emoji: '🐰', label: 'うさぎ' },
  { emoji: '🐻', label: 'くま' },
  { emoji: '🐼', label: 'ぱんだ' },
  { emoji: '🐧', label: 'ぺんぎん' },
] as const;

/** 子どもの呼び方（性別で出し分け。男の子はくん、それ以外はちゃん） */
export function childSuffix(gender: ChildProfile['gender']): string {
  return gender === 'boy' ? 'くん' : 'ちゃん';
}
