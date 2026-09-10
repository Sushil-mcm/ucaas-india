// "Last updated 3 minutes ago" style relative time. Tolerates a bare
// timestamp with no timezone (treats it as UTC) — same handling as documents.tsx.

export function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(dateStr);
  const parsed = new Date(hasTz ? dateStr : `${dateStr}Z`);
  if (Number.isNaN(parsed.getTime())) return '';
  const secs = Math.floor((Date.now() - parsed.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `about ${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `about ${years} year${years === 1 ? '' : 's'} ago`;
}
