import type { SceneDef } from '../types';

interface Props {
  scenes: SceneDef[];
  currentScene: SceneDef | null;
  onSelect: (scene: SceneDef) => void;
}

export function SceneSelector({ scenes, currentScene, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {scenes.map((scene) => {
        const active = currentScene?.id === scene.id;
        return (
          <button
            key={scene.id}
            onClick={() => onSelect(scene)}
            className={`
              relative flex flex-col items-start gap-1 rounded-2xl p-4 text-left
              transition-all duration-300 border
              ${active
                ? 'bg-white/10 border-white/30 shadow-lg shadow-white/5'
                : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'}
            `}
          >
            <span className="text-2xl">{scene.icon}</span>
            <span className="font-semibold text-sm text-white">{scene.name}</span>
            <span className="text-xs text-white/50 leading-tight">{scene.description}</span>
            {active && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            )}
          </button>
        );
      })}
    </div>
  );
}
