'use client';
import { useEffect } from 'react';
import { playSound } from '../lib/audio';
import { useApp } from '../contexts/AppContext';

interface FeedbackOverlayProps {
  type: 'correct' | 'wrong';
  onDone: () => void;
}

export default function FeedbackOverlay({ type, onDone }: FeedbackOverlayProps) {
  const { settings } = useApp();

  useEffect(() => {
    if (settings.soundEffectsEnabled) {
      playSound(type);
    }
    const timer = setTimeout(onDone, 1500);
    return () => clearTimeout(timer);
  }, [type, onDone, settings.soundEffectsEnabled]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fadeIn">
      <div className={`rounded-3xl p-10 shadow-2xl ${type === 'correct' ? 'bg-green-100' : 'bg-orange-100'}`}>
        <div className="text-8xl text-center mb-4">
          {type === 'correct' ? '⭐' : '💪'}
        </div>
        <div className={`text-3xl font-extrabold text-center ${type === 'correct' ? 'text-green-600' : 'text-orange-600'}`}>
          {type === 'correct' ? 'すごい！' : 'おしい！'}
        </div>
      </div>
    </div>
  );
}
