'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../contexts/AppContext';
import { getProfiles } from '../lib/db';

export default function StartPage() {
  const router = useRouter();
  const { settings, isLoading, setCurrentChild } = useApp();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoading || hasRedirected.current) return;

    if (!settings.setupCompleted) {
      hasRedirected.current = true;
      router.replace('/setup');
      return;
    }

    hasRedirected.current = true;
    getProfiles().then(profiles => {
      if (profiles.length === 0) {
        router.replace('/profile/new');
      } else if (profiles.length === 1) {
        setCurrentChild(profiles[0]);
        router.replace('/home');
      } else if (settings.currentChildId) {
        const found = profiles.find(p => p.id === settings.currentChildId);
        if (found) {
          setCurrentChild(found);
          router.replace('/home');
        } else {
          router.replace('/profile');
        }
      } else {
        router.replace('/profile');
      }
    });
  }, [isLoading, settings, router, setCurrentChild]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center animate-scaleIn">
        <div className="text-7xl mb-4">📚</div>
        <div className="text-3xl font-extrabold text-amber-600">ことばの</div>
        <div className="text-3xl font-extrabold text-amber-600">おべんきょう</div>
      </div>
    </div>
  );
}
