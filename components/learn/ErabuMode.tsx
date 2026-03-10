'use client';
import { useState, useCallback } from 'react';
import { VocabularyItem } from '../../types/vocabulary';
import { SessionAnswer } from '../../types/learning';
import { generateDistractors } from '../../lib/learning-engine';
import FeedbackOverlay from '../FeedbackOverlay';

interface ErabuModeProps {
  questions: VocabularyItem[];
  onComplete: (answers: SessionAnswer[]) => void;
}

interface QuizState {
  target: VocabularyItem;
  choices: VocabularyItem[];
}

function makeQuiz(target: VocabularyItem): QuizState {
  const distractors = generateDistractors(target, 3);
  const choices = [...distractors, target].sort(() => Math.random() - 0.5);
  return { target, choices };
}

export default function ErabuMode({ questions, onComplete }: ErabuModeProps) {
  const [index, setIndex] = useState(0);
  const [quiz, setQuiz] = useState<QuizState>(() => makeQuiz(questions[0]));
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const handleSelect = useCallback((selected: VocabularyItem) => {
    if (feedback) return;
    const isCorrect = selected.id === quiz.target.id;
    const answer: SessionAnswer = {
      questionIndex: index,
      vocabId: quiz.target.id,
      isCorrect,
      selectedId: selected.id,
      responseTimeMs: Date.now() - questionStartTime,
      timestamp: new Date().toISOString(),
    };
    setAnswers(prev => [...prev, answer]);
    setFeedback(isCorrect ? 'correct' : 'wrong');
  }, [feedback, quiz.target, index, questionStartTime]);

  const handleFeedbackDone = useCallback(() => {
    setFeedback(null);
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      onComplete([...answers]);
    } else {
      setIndex(nextIndex);
      setQuiz(makeQuiz(questions[nextIndex]));
      setQuestionStartTime(Date.now());
    }
  }, [index, questions, answers, onComplete]);

  return (
    <div className="flex flex-col items-center px-4 py-4">
      {/* 問題文（テキスト表示） */}
      <div className="bg-white rounded-2xl shadow-md px-8 py-5 mb-6 text-center">
        <div className="text-4xl font-extrabold text-gray-800">
          「{quiz.target.word}」
        </div>
        <div className="text-xl text-gray-500 mt-1">は どれ？</div>
      </div>

      {/* 4択 */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {quiz.choices.map(item => (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
            className={`bg-white rounded-2xl shadow-md p-4 aspect-square flex flex-col items-center justify-center active:scale-95 transition-all ${
              feedback && item.id === quiz.target.id ? 'ring-4 ring-green-400' : ''
            } ${feedback && item.id !== quiz.target.id ? 'opacity-50' : ''}`}
          >
            <span className="text-6xl">{item.emoji}</span>
          </button>
        ))}
      </div>

      {feedback && <FeedbackOverlay type={feedback} onDone={handleFeedbackDone} />}
    </div>
  );
}
