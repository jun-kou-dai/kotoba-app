'use client';
import { useState } from 'react';
import { speakText, stopSpeaking } from '../lib/tts';
import { useApp } from '../contexts/AppContext';

export default function SpeakButton({ text, label, className = '' }: { text: string; label?: string; className?: string }) {
  const { settings } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = async () => {
    if (!settings.voiceEnabled) return;
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    try {
      await speakText(text, settings.apiKey || null, settings.voiceName, settings.voiceSpeed);
    } catch {
      // フォールバック失敗は無視
    }
    setIsPlaying(false);
  };

  return (
    <button
      onClick={handlePlay}
      className={`flex items-center gap-2 bg-blue-100 rounded-full px-5 py-3 active:scale-95 transition-transform ${className}`}
    >
      <span className={`text-2xl ${isPlaying ? 'animate-bounce' : ''}`}>
        {isPlaying ? '🔊' : '🔈'}
      </span>
      {label && <span className="text-lg font-bold text-blue-700">{label}</span>}
    </button>
  );
}
