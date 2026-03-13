'use client';
import { useState, useEffect, useCallback } from 'react';
import { ThemeId, VocabularyItem } from '../../types/vocabulary';
import { SessionAnswer } from '../../types/learning';
import { generateNakamawakeChoices } from '../../lib/learning-engine';
import { themes } from '../../data/themes';
import FeedbackOverlay from '../FeedbackOverlay';
import BigButton from '../ui/BigButton';
import { speakText, precacheAudio } from '../../lib/tts';
import { useApp } from '../../contexts/AppContext';

interface NakamawakeModeProps {
  themeId: ThemeId;
  questionCount: number;
  onComplete: (answers: SessionAnswer[]) => void;
}

interface QuizState {
  targetThemeId: ThemeId;
  choices: VocabularyItem[];
  correctIds: string[];
}

const OTHER_THEMES: ThemeId[] = ['doubutsu', 'tabemono', 'iro', 'norimono'];

function makeQuiz(mainThemeId: ThemeId, questionIndex: number): QuizState {
  // 偶数問は対象テーマ、奇数問は他テーマも出す
  const targetThemeId = questionIndex % 3 === 0
    ? OTHER_THEMES.filter(t => t !== mainThemeId)[questionIndex % 3] || mainThemeId
    : mainThemeId;
  const { choices, correctIds } = generateNakamawakeChoices(targetThemeId);
  return { targetThemeId, choices, correctIds };
}

export default function NakamawakeMode({ themeId, questionCount, onComplete }: NakamawakeModeProps) {
  const { settings } = useApp();
  const [index, setIndex] = useState(0);
  const [quiz, setQuiz] = useState<QuizState>(() => makeQuiz(themeId, 0));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const theme = themes.find(t => t.id === quiz.targetThemeId)!;

  // 全テーマのフレーズをプリキャッシュ（4テーマだけなのですぐ完了）
  useEffect(() => {
    if (settings.voiceEnabled && settings.apiKey) {
      precacheAudio(
        themes.map(t => ({ text: `${t.name}は どれ？`, voiceName: settings.voiceName })),
        settings.apiKey,
      );
    }
  }, [settings.voiceEnabled, settings.apiKey, settings.voiceName]);

  useEffect(() => {
    if (settings.voiceEnabled && theme) {
      speakText(`${theme.name}は どれ？`, settings.apiKey || null, settings.voiceName, settings.voiceSpeed).catch(() => {});
    }
  }, [index, theme, settings]);

  const toggleSelect = (id: string) => {
    if (feedback) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = useCallback(() => {
    const correctSet = new Set(quiz.correctIds);
    const isCorrect =
      correctSet.size === selectedIds.size &&
      [...correctSet].every(id => selectedIds.has(id));

    const answer: SessionAnswer = {
      questionIndex: index,
      vocabId: quiz.correctIds[0],
      isCorrect,
      responseTimeMs: Date.now() - questionStartTime,
      timestamp: new Date().toISOString(),
    };
    setAnswers(prev => [...prev, answer]);
    setFeedback(isCorrect ? 'correct' : 'wrong');
  }, [quiz, selectedIds, index, questionStartTime]);

  const handleFeedbackDone = useCallback(() => {
    setFeedback(null);
    setSelectedIds(new Set());
    const nextIndex = index + 1;
    if (nextIndex >= questionCount) {
      onComplete([...answers]);
    } else {
      setIndex(nextIndex);
      setQuiz(makeQuiz(themeId, nextIndex));
      setQuestionStartTime(Date.now());
    }
  }, [index, questionCount, answers, onComplete, themeId]);

  return (
    <div className="flex flex-col items-center px-4 py-4">
      {/* 問題文 */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">{theme.emoji}</div>
        <div className="text-2xl font-extrabold">{theme.name}は どれ？</div>
      </div>

      {/* 6択 */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
        {quiz.choices.map(item => {
          const isSelected = selectedIds.has(item.id);
          const showCorrect = feedback && quiz.correctIds.includes(item.id);
          const showWrong = feedback && isSelected && !quiz.correctIds.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggleSelect(item.id)}
              className={`bg-white rounded-2xl shadow-md p-3 aspect-square flex flex-col items-center justify-center transition-all ${
                isSelected && !feedback ? 'ring-4 ring-green-400 bg-green-50' : ''
              } ${showCorrect ? 'ring-4 ring-green-400 bg-green-50' : ''} ${showWrong ? 'ring-4 ring-red-400 bg-red-50' : ''}`}
            >
              <span className="text-5xl">{item.emoji}</span>
              {isSelected && !feedback && <span className="text-green-500 text-lg mt-1">✓</span>}
            </button>
          );
        })}
      </div>

      {/* 確定 */}
      {!feedback && (
        <BigButton onClick={handleSubmit} disabled={selectedIds.size === 0}>
          できた！
        </BigButton>
      )}

      {feedback && <FeedbackOverlay type={feedback} onDone={handleFeedbackDone} />}
    </div>
  );
}
