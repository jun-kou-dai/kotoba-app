'use client';
import { useState, useCallback, useEffect } from 'react';
import { VocabularyItem } from '../../types/vocabulary';
import { SessionAnswer } from '../../types/learning';
import SpeakButton from '../SpeakButton';
import { speakText, precacheAudio } from '../../lib/tts';
import { useApp } from '../../contexts/AppContext';

interface MiruModeProps {
  questions: VocabularyItem[];
  onComplete: (answers: SessionAnswer[]) => void;
}

export default function MiruMode({ questions, onComplete }: MiruModeProps) {
  const { settings } = useApp();
  const [index, setIndex] = useState(0);
  const [startTime] = useState(Date.now());
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);

  const current = questions[index];

  // 学習開始時に全単語の音声をバックグラウンドでプリキャッシュ
  useEffect(() => {
    if (settings.voiceEnabled && settings.apiKey && questions.length > 0) {
      precacheAudio(
        questions.map(q => ({ text: q.ttsText || q.word, voiceName: settings.voiceName })),
        settings.apiKey,
      );
    }
  }, [questions, settings.voiceEnabled, settings.apiKey, settings.voiceName]);

  // カード切替時の自動音声再生
  useEffect(() => {
    if (settings.voiceEnabled && current) {
      speakText(current.ttsText || current.word, settings.apiKey || null, settings.voiceName, settings.voiceSpeed).catch(() => {});
    }
  }, [index, current, settings]);

  const goNext = useCallback(() => {
    const answer: SessionAnswer = {
      questionIndex: index,
      vocabId: current.id,
      isCorrect: true,
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (index + 1 >= questions.length) {
      onComplete(newAnswers);
    } else {
      setIndex(index + 1);
    }
  }, [index, current, answers, questions.length, onComplete, startTime]);

  const goPrev = useCallback(() => {
    if (index > 0) setIndex(index - 1);
  }, [index]);

  if (!current) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      {/* カード */}
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm text-center animate-scaleIn" key={current.id}>
        <div className="text-[120px] leading-none mb-4">{current.emoji}</div>
        <div className="text-5xl font-extrabold text-gray-800 mb-3">{current.word}</div>
        {current.hint && <div className="text-gray-400 text-lg">{current.hint}</div>}
      </div>

      {/* 音声 */}
      <div className="mt-6">
        <SpeakButton text={current.ttsText || current.word} label="もういちど きく" />
      </div>

      {/* ナビゲーション */}
      <div className="flex items-center gap-6 mt-8">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="text-4xl text-gray-300 disabled:opacity-30 active:scale-90 transition-transform"
        >
          ◀
        </button>
        <span className="text-lg text-gray-400 font-bold">{index + 1} / {questions.length}</span>
        <button
          onClick={goNext}
          className="text-4xl text-green-500 active:scale-90 transition-transform"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
