import { useEffect, useMemo } from 'react';
import { Globe } from 'lucide-react';
import CustomTooltip from '@/components/custom/custom-tooltip';

interface ConnectionStateBadgeProps {
  stats?: any;
  participantId?: string;
  className?: string;
}

type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'bad' | 'unknown';

const getConnectionQualityValue = (stats: any): number | null => {
  const rawValue = stats?.connectionQuality;
  const parsed = Number(typeof rawValue === 'string' ? rawValue.replace(/[^\d.-]/g, '') : rawValue);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const getQualityLevel = (stats: any, qualityValue: number | null): QualityLevel => {
  const normalizedLevel = String(stats?.qualityLevel || '').toLowerCase();
  if (
    normalizedLevel === 'excellent' ||
    normalizedLevel === 'good' ||
    normalizedLevel === 'fair' ||
    normalizedLevel === 'poor' ||
    normalizedLevel === 'bad' ||
    normalizedLevel === 'unknown'
  ) {
    return normalizedLevel;
  }
  if (qualityValue === null) return 'unknown';
  if (qualityValue >= 80) return 'excellent';
  if (qualityValue >= 60) return 'good';
  if (qualityValue >= 40) return 'fair';
  if (qualityValue >= 20) return 'poor';
  return 'bad';
};

const qualityLabels: Record<QualityLevel, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  bad: 'Bad',
  unknown: 'Unknown',
};

const getSignalBars = (qualityValue: number | null) => {
  if (qualityValue === null) return 0;
  if (qualityValue >= 80) return 8;
  if (qualityValue >= 65) return 6;
  if (qualityValue >= 45) return 4;
  if (qualityValue >= 25) return 3;
  if (qualityValue > 0) return 1;
  return 0;
};

const getBarStyle = (barIndex: number, isActive: boolean) => {
  if (!isActive) {
    return {
      backgroundColor: 'rgba(100, 116, 139, 0.2)',
      boxShadow: 'none',
    };
  }

  if (barIndex >= 7) {
    return {
      background: 'linear-gradient(to top, #ef4444, #dc2626)',
      boxShadow: '0 0 6px rgba(239, 68, 68, 0.6), 0 0 3px rgba(239, 68, 68, 0.4)',
    };
  }
  if (barIndex >= 5) {
    return {
      background: 'linear-gradient(to top, #f97316, #ea580c)',
      boxShadow: '0 0 5px rgba(249, 115, 22, 0.5), 0 0 2px rgba(249, 115, 22, 0.3)',
    };
  }
  if (barIndex >= 3) {
    return {
      background: 'linear-gradient(to top, #eab308, #ca8a04)',
      boxShadow: '0 0 5px rgba(234, 179, 8, 0.5), 0 0 2px rgba(234, 179, 8, 0.3)',
    };
  }
  if (barIndex >= 1) {
    return {
      background: 'linear-gradient(to top, #22c55e, #16a34a)',
      boxShadow: '0 0 5px rgba(34, 197, 94, 0.5), 0 0 2px rgba(34, 197, 94, 0.3)',
    };
  }

  return {
    background: 'linear-gradient(to top, #10b981, #059669)',
    boxShadow: '0 0 4px rgba(16, 185, 129, 0.4), 0 0 2px rgba(16, 185, 129, 0.2)',
  };
};

const ConnectionStateBadge = ({
  stats,
  participantId = '',
  className = '',
}: ConnectionStateBadgeProps) => {
  const isLoading = useMemo(() => !stats || typeof stats !== 'object', [stats]);
  const qualityValue = useMemo(() => getConnectionQualityValue(stats), [stats]);
  const qualityLevel = useMemo(() => getQualityLevel(stats, qualityValue), [stats, qualityValue]);

  useEffect(() => {
    if (qualityLevel === 'unknown') {
      console.log('[JITSI-CQ][BADGE] unknown quality render', {
        participantId,
        stats,
        qualityValue,
        qualityLevelFromStats: stats?.qualityLevel,
        connectionQualityFromStats: stats?.connectionQuality,
      });
    }
  }, [qualityLevel, participantId, qualityValue, stats]);

  const qualityLabel = qualityLabels[qualityLevel];
  const signalBars = useMemo(() => getSignalBars(qualityValue), [qualityValue]);
  const title = isLoading
    ? 'Network Connection Quality: Loading...'
    : qualityValue === null
      ? `Network Connection Quality: ${qualityLabel}`
      : `Network Connection Quality: ${qualityLabel} (${qualityValue}%)`;
  if (isLoading) return null;
  return (
    <CustomTooltip text={title} side="top">
      <div
        className={`inline-flex items-center gap-1.5 px-4 py-1 bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 rounded-full backdrop-blur-xl border border-white/10 shadow-lg whitespace-nowrap ${className}`}
      >
        <Globe className="w-3 h-3 text-sky-300" />
        {!isLoading && (
          <div className="flex items-end gap-0.5 h-4">
            {[...Array(8)].map((_, idx) => {
              const active = !isLoading && idx < signalBars;
              return (
                <span
                  key={idx}
                  className={`relative w-0.5 rounded-full transition-all duration-150 ease-out ${
                    isLoading ? 'animate-pulse' : ''
                  }`}
                  style={{
                    height: `${4 + idx * 1.5}px`,
                    ...(isLoading
                      ? { backgroundColor: 'rgba(56, 189, 248, 0.5)' }
                      : getBarStyle(idx, active)),
                    transformOrigin: 'bottom',
                    transform: active ? 'scaleY(1)' : 'scaleY(0.4)',
                    opacity: active ? 1 : isLoading ? 0.55 : 0.25,
                  }}
                />
              );
            })}
          </div>
        )}
        {isLoading && (
          <span className="text-[11px] leading-none font-medium text-sky-200">Loading...</span>
        )}
      </div>
    </CustomTooltip>
  );
};

export default ConnectionStateBadge;
