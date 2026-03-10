'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../contexts/AppContext';
import { getProfiles } from '../../lib/db';
import { ChildProfile } from '../../types/profile';

export default function ProfileSelectPage() {
  const router = useRouter();
  const { setCurrentChild } = useApp();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);

  useEffect(() => {
    getProfiles().then(setProfiles);
  }, []);

  const handleSelect = (profile: ChildProfile) => {
    setCurrentChild(profile);
    router.push('/home');
  };

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold">だれが つかう？</h1>
      </div>

      <div className="space-y-4">
        {profiles.map(p => (
          <button
            key={p.id}
            onClick={() => handleSelect(p)}
            className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 shadow-md active:scale-95 transition-transform"
          >
            <span className="text-5xl">{p.avatarEmoji}</span>
            <div className="text-left">
              <div className="text-2xl font-extrabold">{p.name}</div>
              <div className="text-gray-400">{p.age}さい</div>
            </div>
          </button>
        ))}

        <button
          onClick={() => router.push('/profile/new')}
          className="w-full flex items-center justify-center gap-2 bg-gray-100 rounded-2xl p-5 text-gray-500 text-xl font-bold"
        >
          ＋ あたらしい おともだち
        </button>
      </div>
    </div>
  );
}
