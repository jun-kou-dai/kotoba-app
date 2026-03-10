export default function ProgressBar({ current, total, className = '' }: { current: number; total: number; className?: string }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className={`w-full bg-gray-200 rounded-full h-3 ${className}`}>
      <div
        className="bg-green-400 h-3 rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
