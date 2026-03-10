import { Theme } from '../types/vocabulary';

export const themes: Theme[] = [
  {
    id: 'doubutsu',
    name: 'どうぶつ',
    emoji: '🐾',
    color: 'from-amber-400 to-orange-500',
    description: 'いろんな どうぶつを おぼえよう',
  },
  {
    id: 'tabemono',
    name: 'たべもの',
    emoji: '🍽️',
    color: 'from-red-400 to-pink-500',
    description: 'おいしい たべものの なまえ',
  },
  {
    id: 'iro',
    name: 'いろ',
    emoji: '🎨',
    color: 'from-violet-400 to-purple-500',
    description: 'きれいな いろを おぼえよう',
  },
  {
    id: 'norimono',
    name: 'のりもの',
    emoji: '🚗',
    color: 'from-blue-400 to-cyan-500',
    description: 'かっこいい のりもの いっぱい',
  },
];

export function getThemeById(id: string): Theme | undefined {
  return themes.find(t => t.id === id);
}
