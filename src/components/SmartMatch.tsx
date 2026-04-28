import { useState } from 'react';
import type { SmartMatchInput } from '../types';
import { getCurrentTimeOfDay } from '../hooks/useSmartMatch';

interface Props {
  onMatch: (input: SmartMatchInput) => void;
}

const TIME_OPTIONS = [
  { value: 'morning', label: '早晨', emoji: '🌅' },
  { value: 'afternoon', label: '下午', emoji: '☀️' },
  { value: 'evening', label: '傍晚', emoji: '🌆' },
  { value: 'night', label: '深夜', emoji: '🌙' },
];

const WEATHER_OPTIONS = [
  { value: 'sunny', label: '晴天', emoji: '☀️' },
  { value: 'cloudy', label: '多云', emoji: '⛅' },
  { value: 'rainy', label: '下雨', emoji: '🌧️' },
  { value: 'stormy', label: '雷雨', emoji: '⛈️' },
];

const MOOD_OPTIONS = [
  { value: 'calm', label: '平静', emoji: '😌' },
  { value: 'focus', label: '专注', emoji: '🧘' },
  { value: 'energized', label: '活力', emoji: '⚡' },
  { value: 'sleepy', label: '困倦', emoji: '😴' },
  { value: 'melancholy', label: '惆怅', emoji: '🌧' },
  { value: 'social', label: '社交', emoji: '🤝' },
];

export function SmartMatch({ onMatch }: Props) {
  const [timeOfDay, setTimeOfDay] = useState(getCurrentTimeOfDay());
  const [weather, setWeather] = useState('sunny');
  const [mood, setMood] = useState('calm');

  const handleMatch = () => onMatch({ timeOfDay, weather, mood });

  return (
    <div className="flex flex-col gap-4">
      <Group label="时间段" options={TIME_OPTIONS} value={timeOfDay} onChange={setTimeOfDay} />
      <Group label="天气" options={WEATHER_OPTIONS} value={weather} onChange={setWeather} />
      <Group label="心情" options={MOOD_OPTIONS} value={mood} onChange={setMood} />

      <button
        onClick={handleMatch}
        className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold
          bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25
          transition-all text-white/90"
      >
        ✨ 为我匹配场景
      </button>
    </div>
  );
}

function Group({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string; emoji: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-white/40 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all border
              ${value === opt.value
                ? 'bg-white/15 border-white/25 text-white'
                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'}
            `}
          >
            <span>{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
