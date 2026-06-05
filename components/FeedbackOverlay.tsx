'use client';
import { useEffect } from 'react';
import { playSound } from '../lib/audio';
import { useApp } from '../contexts/AppContext';

interface FeedbackOverlayProps {
  type: 'correct' | 'wrong';
  onDone: () => void;
}

export default function FeedbackOverlay({ type, onDone }: FeedbackOverlayProps) {
  const { settings, currentChild } = useApp();
  const avatar = currentChild?.avatarEmoji || '🐶';
  const isCorrect = type === 'correct';

  useEffect(() => {
    if (settings.soundEffectsEnabled) {
      playSound(type);
    }
    const timer = setTimeout(onDone, 1500);
    return () => clearTimeout(timer);
  }, [type, onDone, settings.soundEffectsEnabled]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fadeIn">
      <div className={`rounded-3xl p-10 shadow-2xl text-center ${isCorrect ? 'bg-green-100' : 'bg-orange-100'}`}>
        {/* 相棒アバターが一緒に反応する */}
        <div className="relative inline-block mb-3">
          <span className="block text-[110px] leading-none animate-bounceIn">{avatar}</span>
          <span className="absolute -top-1 -right-2 text-5xl animate-bounceIn">{isCorrect ? '🎉' : '💪'}</span>
        </div>
        <div className={`text-3xl font-extrabold ${isCorrect ? 'text-green-600' : 'text-orange-600'}`}>
          {isCorrect ? 'すごいね！' : 'いっしょに もういっかい！'}
        </div>
      </div>
    </div>
  );
}
