'use client';
import { VocabularyItem } from '../types/vocabulary';

interface VocabCardProps {
  item: VocabularyItem;
  masteryLevel?: number;
  onClick?: () => void;
  selected?: boolean;
  showWord?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function VocabCard({ item, masteryLevel, onClick, selected, showWord = true, size = 'md' }: VocabCardProps) {
  const sizes = {
    sm: 'p-2 rounded-xl',
    md: 'p-4 rounded-2xl',
    lg: 'p-6 rounded-3xl',
  };
  const emojiSizes = { sm: 'text-4xl', md: 'text-6xl', lg: 'text-8xl' };
  const textSizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' };

  const border = selected
    ? 'border-4 border-green-400 bg-green-50'
    : 'border-2 border-gray-200 bg-white';

  const masteryIcons = ['', '🌱', '🌿', '🌸'];

  return (
    <button
      onClick={onClick}
      className={`${sizes[size]} ${border} shadow-md flex flex-col items-center justify-center gap-1 active:scale-95 transition-all w-full aspect-square`}
    >
      <span className={emojiSizes[size]}>{item.emoji}</span>
      {showWord && <span className={`${textSizes[size]} font-extrabold text-gray-800`}>{item.word}</span>}
      {masteryLevel !== undefined && masteryLevel > 0 && (
        <span className="text-sm">{masteryIcons[masteryLevel]}</span>
      )}
    </button>
  );
}
