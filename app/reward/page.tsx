'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../contexts/AppContext';
import { getSessionsByChild } from '../../lib/db';
import { STICKERS, countEarnedStickers } from '../../data/rewards';
import { childSuffix } from '../../types/profile';
import { playSound } from '../../lib/audio';

export default function RewardPage() {
  const router = useRouter();
  const { currentChild, isLoading } = useApp();
  const [earned, setEarned] = useState(0);

  useEffect(() => {
    if (isLoading) return;
    if (!currentChild) { router.replace('/'); return; }
    getSessionsByChild(currentChild.id).then(sessions => setEarned(countEarnedStickers(sessions)));
  }, [currentChild, isLoading, router]);

  if (!currentChild) return null;

  const allCollected = earned >= STICKERS.length;

  return (
    <div className="min-h-screen px-4 py-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-3xl text-gray-300 active:scale-90 transition-transform">◀</button>
        <span className="text-4xl">{currentChild.avatarEmoji}</span>
        <div>
          <div className="text-xl font-extrabold">{currentChild.name}{childSuffix(currentChild.gender)}の ごほうび</div>
          <div className="text-sm text-amber-500 font-bold">🎁 {earned}こ あつめたよ</div>
        </div>
      </div>

      {allCollected && (
        <div className="bg-gradient-to-br from-amber-100 to-pink-100 rounded-2xl p-4 mb-4 text-center text-lg font-extrabold text-fuchsia-600 animate-bounceIn">
          🎉 ぜんぶ あつめたね！ すごい！
        </div>
      )}

      {/* シール図鑑（あつめたシールはタップで音が鳴る） */}
      <div className="grid grid-cols-4 gap-3">
        {STICKERS.map((s, i) => {
          const got = i < earned;
          if (got) {
            return (
              <button
                key={i}
                onClick={() => playSound('correct')}
                className="aspect-square rounded-2xl flex items-center justify-center text-4xl shadow-md bg-gradient-to-br from-amber-100 to-pink-100 active:scale-110 transition-transform"
              >
                {s}
              </button>
            );
          }
          return (
            <div key={i} className="aspect-square rounded-2xl flex items-center justify-center shadow-md bg-gray-100">
              <span className="text-gray-300 text-3xl">❓</span>
            </div>
          );
        })}
      </div>

      {earned === 0 && (
        <div className="text-center text-gray-400 mt-8 text-lg leading-relaxed">
          クイズを クリアすると<br />ごほうびが もらえるよ！
        </div>
      )}
    </div>
  );
}
