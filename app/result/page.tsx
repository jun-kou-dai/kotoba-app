'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { calculateStars } from '../../types/learning';
import { getThemeById } from '../../data/themes';
import BigButton from '../../components/ui/BigButton';
import { playSound } from '../../lib/audio';
import { useApp } from '../../contexts/AppContext';

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { settings } = useApp();
  const correct = Number(searchParams.get('correct') || 0);
  const total = Number(searchParams.get('total') || 0);
  const themeId = searchParams.get('themeId') || '';
  const mode = searchParams.get('mode') || '';
  const theme = getThemeById(themeId);
  const stars = calculateStars(correct, total);

  // 結果画面表示時に完了ファンファーレ
  useEffect(() => {
    if (settings.soundEffectsEnabled) {
      playSound('complete');
    }
  }, [settings.soundEffectsEnabled]);

  const messages = [
    'つぎも がんばろう！',
    'よく できました！',
    'すごーい！ かんぺき！',
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* 星 */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(i => (
          <span key={i} className={`text-6xl ${i <= stars ? 'animate-bounceIn' : 'opacity-20'}`} style={{ animationDelay: `${i * 0.2}s` }}>
            ⭐
          </span>
        ))}
      </div>

      {/* メッセージ */}
      <div className="text-3xl font-extrabold text-center mb-4 animate-scaleIn">
        {messages[stars - 1]}
      </div>

      {/* スコア */}
      <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-sm text-center mb-8">
        <div className="text-6xl font-extrabold text-green-500 mb-2">
          {correct} <span className="text-gray-300 text-3xl">/ {total}</span>
        </div>
        {theme && (
          <div className="text-gray-400">
            {theme.emoji} {theme.name}
          </div>
        )}
      </div>

      {/* ボタン */}
      <div className="w-full max-w-sm space-y-3">
        <BigButton onClick={() => router.push(mode ? `/learn/${themeId}/${mode}` : `/theme/${themeId}`)}>
          もういちど
        </BigButton>
        <BigButton variant="secondary" onClick={() => router.push('/home')}>
          ホームに もどる
        </BigButton>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-3xl animate-bounce">⭐</div></div>}>
      <ResultContent />
    </Suspense>
  );
}
