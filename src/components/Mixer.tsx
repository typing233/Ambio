import type { LayerState } from '../types';

interface Props {
  layers: LayerState[];
  onVolumeChange: (id: string, vol: number) => void;
  onToggleMute: (id: string) => void;
}

export function Mixer({ layers, onVolumeChange, onToggleMute }: Props) {
  if (layers.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {layers.map((layer) => (
        <div key={layer.id} className="flex items-center gap-3">
          <button
            onClick={() => onToggleMute(layer.id)}
            title={layer.muted ? '取消静音' : '静音'}
            className={`
              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
              text-xs transition-all
              ${layer.muted
                ? 'bg-white/10 text-white/30'
                : 'bg-white/15 text-white/70 hover:bg-white/20'}
            `}
          >
            {layer.muted ? '🔇' : '🔊'}
          </button>

          <span className="w-20 flex-shrink-0 text-xs text-white/60 truncate">
            {layer.name}
          </span>

          <div className="flex-1 relative h-1.5 bg-white/10 rounded-full group cursor-pointer">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={layer.muted ? 0 : layer.volume}
              onChange={(e) => {
                if (layer.muted) onToggleMute(layer.id);
                onVolumeChange(layer.id, parseFloat(e.target.value));
              }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
              aria-label={`${layer.name} 音量`}
            />
            <div
              className="h-full bg-white/50 rounded-full transition-all pointer-events-none"
              style={{ width: `${(layer.muted ? 0 : layer.volume) * 100}%` }}
            />
            {/* thumb indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow pointer-events-none transition-all"
              style={{ left: `calc(${(layer.muted ? 0 : layer.volume) * 100}% - 6px)` }}
            />
          </div>

          <span className="w-7 flex-shrink-0 text-right text-xs text-white/30">
            {Math.round((layer.muted ? 0 : layer.volume) * 100)}
          </span>
        </div>
      ))}
    </div>
  );
}
