'use client';
import { ReactNode } from 'react';

interface BigButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

export default function BigButton({ children, onClick, className = '', disabled, variant = 'primary' }: BigButtonProps) {
  const base = 'w-full min-h-[56px] rounded-2xl font-bold text-xl active:scale-95 transition-transform disabled:opacity-50';
  const variants = {
    primary: 'bg-green-500 text-white shadow-lg',
    secondary: 'bg-gray-100 text-gray-700',
    outline: 'border-2 border-gray-300 text-gray-600',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}
