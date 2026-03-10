'use client';
import Link from 'next/link';
import { Theme } from '../types/vocabulary';

export default function ThemeCard({ theme, mastery }: { theme: Theme; mastery?: number }) {
  return (
    <Link
      href={`/theme/${theme.id}`}
      className={`block rounded-3xl bg-gradient-to-br ${theme.color} p-5 text-white shadow-lg active:scale-95 transition-transform`}
    >
      <div className="text-5xl mb-2">{theme.emoji}</div>
      <div className="text-2xl font-extrabold">{theme.name}</div>
      <div className="text-sm opacity-90 mt-1">{theme.description}</div>
      {mastery !== undefined && (
        <div className="mt-3 bg-white/30 rounded-full h-2">
          <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${Math.round(mastery * 100)}%` }} />
        </div>
      )}
    </Link>
  );
}
