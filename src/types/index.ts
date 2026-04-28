export type SceneId = 'forest' | 'cafe' | 'rain' | 'study';

export interface LayerDef {
  id: string;
  name: string;
  type: 'base' | 'detail';
  /** Volume 0–1 */
  defaultVolume: number;
  /** For detail layers: random trigger interval range in ms */
  triggerInterval?: { min: number; max: number };
}

export interface SceneDef {
  id: SceneId;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  gradient: string;
  layers: LayerDef[];
  /** Matching tags */
  timeOfDay: string[];
  weather: string[];
  moods: string[];
}

export interface LayerState {
  id: string;
  name: string;
  volume: number;
  muted: boolean;
}

export interface SmartMatchInput {
  timeOfDay: string;
  weather: string;
  mood: string;
}

export interface TimerOption {
  label: string;
  minutes: number;
}
