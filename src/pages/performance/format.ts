export const formatSecsToClock = (totalSeconds: number) => {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '--:--';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const formatPercent = (numerator: number, denominator: number) => {
  if (!denominator) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
};

// Handles both 'HH:MM:SS' style strings (billsec/duration) and plain numbers.
export const timeStringToSeconds = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':').map((part) => Number(part));
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  const seconds = parts.reduceRight(
    (total, part, index) => total + part * Math.pow(60, parts.length - 1 - index),
    0,
  );
  return Math.max(0, Math.floor(seconds));
};
