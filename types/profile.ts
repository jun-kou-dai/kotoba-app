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
