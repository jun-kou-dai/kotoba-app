'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../contexts/AppContext';
import { saveProfile } from '../../../lib/db';
import { ChildProfile, AVATAR_OPTIONS } from '../../../types/profile';
import BigButton from '../../../components/ui/BigButton';

export default function NewProfilePage() {
  const router = useRouter();
  const { setCurrentChild } = useApp();
  const [name, setName] = useState('');
  const [age, setAge] = useState<2 | 3 | 4 | 5>(3);
  const [gender, setGender] = useState<'boy' | 'girl' | ''>('');
  const [avatar, setAvatar] = useState('🐶');

  const handleCreate = async () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const profile: ChildProfile = {
      id: crypto.randomUUID(),
      name: name.trim(),
      age,
      gender,
      avatarEmoji: avatar,
      createdAt: now,
      updatedAt: now,
    };
    await saveProfile(profile);
    setCurrentChild(profile);
    router.push('/home');
  };

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="text-center mb-8">
        <div className="text-6xl mb-2">{avatar}</div>
        <h1 className="text-2xl font-extrabold">おなまえを おしえてね</h1>
      </div>

      <div className="space-y-6">
        {/* 名前 */}
        <div>
          <label className="block text-lg font-bold mb-2">なまえ</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ひらがなで いれてね"
            className="w-full bg-white rounded-xl px-4 py-4 text-2xl border-2 border-gray-200 focus:border-green-400 outline-none text-center"
            maxLength={10}
          />
        </div>

        {/* 年齢 */}
        <div>
          <label className="block text-lg font-bold mb-2">なんさい？</label>
          <div className="grid grid-cols-4 gap-3">
            {([2, 3, 4, 5] as const).map(a => (
              <button
                key={a}
                onClick={() => setAge(a)}
                className={`py-4 rounded-xl text-2xl font-extrabold transition-all ${
                  age === a ? 'bg-green-400 text-white scale-105' : 'bg-white text-gray-600 border-2 border-gray-200'
                }`}
              >
                {a}さい
              </button>
            ))}
          </div>
        </div>

        {/* 性別 */}
        <div>
          <label className="block text-lg font-bold mb-2">せいべつ</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'boy' as const, label: '👦 おとこのこ' },
              { value: 'girl' as const, label: '👧 おんなのこ' },
              { value: '' as const, label: '🌈 えらばない' },
            ].map(g => (
              <button
                key={g.value}
                onClick={() => setGender(g.value)}
                className={`py-3 rounded-xl text-base font-bold transition-all ${
                  gender === g.value ? 'bg-green-400 text-white' : 'bg-white text-gray-600 border-2 border-gray-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* アバター */}
        <div>
          <label className="block text-lg font-bold mb-2">アイコン</label>
          <div className="grid grid-cols-6 gap-3">
            {AVATAR_OPTIONS.map(opt => (
              <button
                key={opt.emoji}
                onClick={() => setAvatar(opt.emoji)}
                className={`aspect-square rounded-xl text-3xl flex items-center justify-center transition-all ${
                  avatar === opt.emoji ? 'bg-green-400 scale-110 shadow-lg' : 'bg-white border-2 border-gray-200'
                }`}
              >
                {opt.emoji}
              </button>
            ))}
          </div>
        </div>

        <BigButton onClick={handleCreate} disabled={!name.trim()}>
          はじめる！
        </BigButton>
      </div>
    </div>
  );
}
