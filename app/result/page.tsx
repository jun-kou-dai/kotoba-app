'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { calculateStars } from '../../types/learning';
import { getThemeById } from '../../data/themes';
import BigButton from '../../components/ui/BigButton';
import { playSound } from '../../lib/audio';
import { useApp } from '../../contexts/AppContext';
import { STICKERS } from '../../data/rewards';

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { settings, currentChild } = useApp();
  const correct = Number(searchParams.get('correct') || 0);
  const total = Number(searchParams.get('total') || 0);
  const themeId = searchParams.get('themeId') || '';
  const mode = searchParams.get('mode') || '';
  const isMiru = mode === 'miru';
  const earnedParam = searchParams.get('earned');
  const earnedIndex = earnedParam !== null ? Number(earnedParam) : -1;
  const newSticker = earnedIndex >= 0 && earnedIndex < STICKERS.length ? STICKERS[earnedIndex] : null;
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
      {isMiru ? (
        <>
          {/* みる用: 正誤がないので星は出さず「ぜんぶ みたね！」 */}
          <div className="text-7xl mb-6 animate-bounceIn">👀</div>
          <div className="text-3xl font-extrabold text-center mb-4 animate-scaleIn">
            ぜんぶ みたね！
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-sm text-center mb-8">
            <div className="text-2xl font-extrabold text-green-500 mb-1">
              {total}こ の ことばを みたよ
            </div>
            {theme && (
              <div className="text-gray-400">
                {theme.emoji} {theme.name}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
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
        </>
      )}

      {/* ごほうび */}
      {newSticker && (
        <div className="bg-white rounded-2xl shadow-md p-5 w-full max-w-sm text-center mb-6">
          <div className="text-sm text-amber-500 font-bold mb-2">🎁 ごほうび ゲット！</div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl animate-bounceIn">{currentChild?.avatarEmoji}</span>
            <span className="text-2xl text-gray-300">→</span>
            <span className="text-6xl animate-bounceIn">{newSticker}</span>
          </div>
          <button onClick={() => router.push('/reward')} className="mt-3 text-fuchsia-600 font-bold text-sm active:scale-95 transition-transform">
            ずかんを みる ▶
          </button>
        </div>
      )}

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
