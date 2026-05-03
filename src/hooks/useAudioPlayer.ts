import { useState, useEffect, useCallback, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { SCENES } from '../audio/scenes';
import type { SceneDef, LayerState } from '../types';

function updateMousePosition(e: MouseEvent) {
  const normalizedX = e.clientX / window.innerWidth;
  const normalizedY = e.clientY / window.innerHeight;
  audioEngine.updateMousePosition(normalizedX, normalizedY);
}

function updateTouchPosition(e: TouchEvent) {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const normalizedX = touch.clientX / window.innerWidth;
    const normalizedY = touch.clientY / window.innerHeight;
    audioEngine.updateMousePosition(normalizedX, normalizedY);
  }
}

export function useAudioPlayer() {
  const [currentScene, setCurrentScene] = useState<SceneDef | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [layers, setLayers] = useState<LayerState[]>([]);
  const [timerMinutes, setTimerMinutes] = useState<number>(0);
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('touchmove', updateTouchPosition);
    window.addEventListener('touchstart', updateTouchPosition);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('touchmove', updateTouchPosition);
      window.removeEventListener('touchstart', updateTouchPosition);
    };
  }, []);

  const loadScene = useCallback(async (scene: SceneDef) => {
    await audioEngine.loadScene(scene);
    setCurrentScene(scene);
    setIsPlaying(true);
    setLayers(
      scene.layers.map((l) => ({
        id: l.id,
        name: l.name,
        volume: l.defaultVolume,
        muted: false,
      }))
    );
  }, []);

  const play = useCallback(async (scene?: SceneDef) => {
    const target = scene ?? currentScene ?? SCENES[0];
    if (scene && scene.id !== currentScene?.id) {
      await loadScene(scene);
    } else {
      audioEngine.resume();
      setIsPlaying(true);
    }
    if (!currentScene) {
      await loadScene(target);
    }
  }, [currentScene, loadScene]);

  const pause = useCallback(() => {
    audioEngine.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [isPlaying, pause, play]);

  const selectScene = useCallback(async (scene: SceneDef) => {
    await loadScene(scene);
  }, [loadScene]);

  const setLayerVolume = useCallback((layerId: string, volume: number) => {
    audioEngine.setLayerVolume(layerId, volume);
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, volume } : l))
    );
  }, []);

  const toggleMute = useCallback((layerId: string) => {
    setLayers((prev) => {
      const layer = prev.find((l) => l.id === layerId);
      if (!layer) return prev;
      const newMuted = !layer.muted;
      audioEngine.setLayerVolume(layerId, newMuted ? 0 : layer.volume);
      return prev.map((l) => (l.id === layerId ? { ...l, muted: newMuted } : l));
    });
  }, []);

  // ── timer ──────────────────────────────────────────────────────────────────

  const startTimer = useCallback((minutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerMinutes(minutes);
    setTimerRemaining(minutes * 60);

    timerRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          audioEngine.pause();
          setIsPlaying(false);
          setTimerMinutes(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const cancelTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setTimerMinutes(0);
    setTimerRemaining(0);
  }, []);

  useEffect(() => () => { audioEngine.stopAll(); }, []);

  return {
    currentScene,
    isPlaying,
    layers,
    timerMinutes,
    timerRemaining,
    play,
    pause,
    toggle,
    selectScene,
    setLayerVolume,
    toggleMute,
    startTimer,
    cancelTimer,
  };
}
