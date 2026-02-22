const KG_TO_LBS = 2.20462;
const KM_TO_MI = 0.621371;

export function convertWeight(value: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): number {
  if (from === to) return value;
  if (from === 'kg' && to === 'lbs') return value * KG_TO_LBS;
  return value / KG_TO_LBS;
}

export function formatWeight(value: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): string {
  const converted = convertWeight(value, from, to);
  return `${Number(converted.toFixed(1))} ${to}`;
}

export function convertDistance(value: number, from: 'km' | 'mi', to: 'km' | 'mi'): number {
  if (from === to) return value;
  if (from === 'km' && to === 'mi') return value * KM_TO_MI;
  return value / KM_TO_MI;
}

export function formatDistance(value: number, from: 'km' | 'mi', to: 'km' | 'mi'): string {
  const converted = convertDistance(value, from, to);
  return `${Number(converted.toFixed(2))} ${to}`;
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
