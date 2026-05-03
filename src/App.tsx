import { useState } from 'react';
import { SCENES } from './audio/scenes';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { smartMatch } from './hooks/useSmartMatch';
import { SceneSelector } from './components/SceneSelector';
import { Mixer } from './components/Mixer';
import { SmartMatch } from './components/SmartMatch';
import { SleepTimer } from './components/SleepTimer';
import type { SmartMatchInput } from './types';

type Tab = 'scene' | 'smart' | 'mixer' | 'timer';

export default function App() {
  const [tab, setTab] = useState<Tab>('scene');
  const {
    currentScene,
    isPlaying,
    layers,
    timerMinutes,
    timerRemaining,
    spatialAudioEnabled,
    toggle,
    selectScene,
    setLayerVolume,
    toggleMute,
    startTimer,
    cancelTimer,
    toggleSpatialAudio,
  } = useAudioPlayer();

  const handleSmartMatch = async (input: SmartMatchInput) => {
    const scene = smartMatch(input);
    await selectScene(scene);
    setTab('scene');
  };

  const bg = currentScene?.gradient ?? 'from-stone-950 via-zinc-900 to-neutral-950';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bg} transition-all duration-1000 flex flex-col`}>
      {/* header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-white/90">Ambio</h1>
          <p className="text-xs text-white/35 mt-0.5">沉浸环境音</p>
        </div>
        <button
          onClick={toggle}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-200 border ${
            isPlaying
              ? 'bg-white/15 border-white/25 hover:bg-white/20'
              : 'bg-white/10 border-white/15 hover:bg-white/15'
          }`}
          aria-label={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      </header>

      {/* now playing */}
      {currentScene && (
        <div className="px-6 py-3 flex items-center gap-3">
          <span className="text-3xl">{currentScene.icon}</span>
          <div>
            <p className="text-sm font-semibold text-white/90">{currentScene.name}</p>
            <p className="text-xs text-white/40">{currentScene.description}</p>
          </div>
          {isPlaying && (
            <div className="ml-auto flex gap-0.5 items-end h-5">
              {[0.4, 0.7, 1, 0.6, 0.8].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-white/50 animate-pulse"
                  style={{
                    height: `${h * 100}%`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: `${0.8 + i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* tab bar */}
      <div className="flex gap-1 px-6 py-2">
        {([
          { id: 'scene' as Tab, label: '场景' },
          { id: 'smart' as Tab, label: '智能匹配' },
          { id: 'mixer' as Tab, label: '混音' },
          { id: 'timer' as Tab, label: '定时' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
              tab === t.id
                ? 'bg-white/15 text-white'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* content */}
      <main className="flex-1 px-6 pb-8 overflow-y-auto scrollbar-hide">
        {tab === 'scene' && (
          <SceneSelector
            scenes={SCENES}
            currentScene={currentScene}
            onSelect={selectScene}
          />
        )}
        {tab === 'smart' && <SmartMatch onMatch={handleSmartMatch} />}
        {tab === 'mixer' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">🎵 空间音频</span>
                <span className={`text-xs ${spatialAudioEnabled ? 'text-emerald-400' : 'text-white/30'}`}>
                  {spatialAudioEnabled ? '已启用' : '已禁用'}
                </span>
              </div>
              <button
                onClick={toggleSpatialAudio}
                className={`w-11 h-6 rounded-full transition-all duration-200 relative ${
                  spatialAudioEnabled
                    ? 'bg-emerald-500/80'
                    : 'bg-white/15'
                }`}
                title={spatialAudioEnabled ? '禁用空间音频' : '启用空间音频'}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                    spatialAudioEnabled ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            
            {spatialAudioEnabled && (
              <div className="px-2 py-2 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-white/40">
                  💡 移动鼠标时，部分音效的声道和音量会随之变化。
                </p>
                <p className="text-xs text-white/30 mt-1">
                  如果这干扰了您的音量调节，可以关闭此功能。
                </p>
              </div>
            )}
            
            {layers.length > 0 ? (
              <Mixer
                layers={layers}
                onVolumeChange={setLayerVolume}
                onToggleMute={toggleMute}
              />
            ) : (
              <p className="text-sm text-white/30 text-center mt-4">请先选择一个场景</p>
            )}
          </div>
        )}
        {tab === 'timer' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-white/40 mb-1">定时关闭</p>
            <SleepTimer
              timerMinutes={timerMinutes}
              timerRemaining={timerRemaining}
              onStart={startTimer}
              onCancel={cancelTimer}
            />
          </div>
        )}
      </main>
    </div>
  );
}
