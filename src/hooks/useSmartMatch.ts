import type { SceneDef, SceneId, SmartMatchInput } from '../types';
import { SCENES } from '../audio/scenes';

interface MatchScore {
  sceneId: SceneId;
  score: number;
}

const TIME_MAP: Record<string, string[]> = {
  morning: ['morning'],      // 06–11
  afternoon: ['afternoon'],  // 11–17
  evening: ['evening'],      // 17–21
  night: ['night'],          // 21–06
};

const WEATHER_MAP: Record<string, string[]> = {
  sunny: ['sunny'],
  cloudy: ['cloudy', 'sunny'],
  rainy: ['rainy', 'stormy'],
  stormy: ['stormy', 'rainy'],
  any: ['sunny', 'cloudy', 'rainy', 'stormy'],
};

const MOOD_MAP: Record<string, string[]> = {
  calm: ['calm', 'sleepy'],
  focus: ['focus', 'calm'],
  energized: ['energized', 'social'],
  sleepy: ['sleepy', 'calm', 'melancholy'],
  melancholy: ['melancholy', 'calm', 'sleepy'],
  social: ['social', 'energized'],
  refreshed: ['refreshed', 'calm'],
};

export function getCurrentTimeOfDay(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export function smartMatch(input: SmartMatchInput): SceneDef {
  const scores: MatchScore[] = SCENES.map((scene) => {
    let score = 0;

    // time match
    const timeAliases = TIME_MAP[input.timeOfDay] ?? [input.timeOfDay];
    const hasTime = scene.timeOfDay.some((t) => timeAliases.includes(t));
    if (hasTime) score += 3;

    // weather match
    const weatherAliases = WEATHER_MAP[input.weather] ?? [input.weather];
    const hasWeather =
      scene.weather.includes('any') ||
      scene.weather.some((w) => weatherAliases.includes(w));
    if (hasWeather) score += 3;

    // mood match
    const moodAliases = MOOD_MAP[input.mood] ?? [input.mood];
    const moodHits = scene.moods.filter((m) => moodAliases.includes(m)).length;
    score += moodHits * 2;

    return { sceneId: scene.id, score };
  });

  scores.sort((a, b) => b.score - a.score);
  const best = SCENES.find((s) => s.id === scores[0].sceneId);
  return best ?? SCENES[0];
}
