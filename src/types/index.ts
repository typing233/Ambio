export type SceneId = 'forest' | 'cafe' | 'rain' | 'study';

export interface SpatialBehavior {
  /** Whether this layer's pan is affected by mouse X position */
  panAffected: boolean;
  /** Base pan value (-1 to 1) when mouse is centered */
  basePan: number;
  /** Pan range (-1 to 1) - how much pan changes with mouse movement */
  panRange: number;
  /** Whether this layer's volume is affected by mouse position */
  volumeAffected: boolean;
  /** Volume multiplier when mouse is at the "center" position */
  baseVolumeMultiplier: number;
  /** Volume range multiplier - max volume increase/decrease */
  volumeRangeMultiplier: number;
  /** Which axis affects volume: 'x' (horizontal) or 'y' (vertical) or 'both' */
  volumeAxis: 'x' | 'y' | 'both';
}

export interface TriggerRelation {
  /** The target layer ID whose probability should be affected */
  targetLayerId: string;
  /** Probability multiplier when this trigger occurs */
  probabilityMultiplier: number;
  /** Duration in ms the multiplier remains active */
  durationMs: number;
}

export interface LayerDef {
  id: string;
  name: string;
  type: 'base' | 'detail';
  /** Volume 0–1 */
  defaultVolume: number;
  /** For detail layers: random trigger interval range in ms */
  triggerInterval?: { min: number; max: number };
  /** Spatial behavior configuration - how mouse position affects this layer */
  spatialBehavior?: Partial<SpatialBehavior>;
  /** Trigger relations - when this layer triggers, it affects other layers' probabilities */
  triggerRelations?: TriggerRelation[];
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
