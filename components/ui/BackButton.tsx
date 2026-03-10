'use client';
import { useRouter } from 'next/navigation';

export default function BackButton({ label }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 text-gray-500 active:scale-95 transition-transform px-2 py-2"
    >
      <span className="text-2xl">◀</span>
      {label && <span className="text-lg font-bold">{label}</span>}
    </button>
  );
}
