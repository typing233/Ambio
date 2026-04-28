interface Props {
  timerMinutes: number;
  timerRemaining: number;
  onStart: (minutes: number) => void;
  onCancel: () => void;
}

const TIMER_OPTIONS = [
  { label: '15 分钟', minutes: 15 },
  { label: '30 分钟', minutes: 30 },
  { label: '45 分钟', minutes: 45 },
  { label: '1 小时', minutes: 60 },
  { label: '2 小时', minutes: 120 },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SleepTimer({ timerMinutes, timerRemaining, onStart, onCancel }: Props) {
  const active = timerMinutes > 0;

  return (
    <div className="flex flex-col gap-3">
      {active ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">⏰ 剩余</span>
            <span className="font-mono text-base text-white font-semibold">
              {formatTime(timerRemaining)}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded border border-white/10 hover:border-white/20"
          >
            取消
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {TIMER_OPTIONS.map((opt) => (
            <button
              key={opt.minutes}
              onClick={() => onStart(opt.minutes)}
              className="rounded-lg px-3 py-1.5 text-xs border border-white/10 bg-white/5
                hover:bg-white/10 hover:border-white/20 text-white/60 hover:text-white/80
                transition-all"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
