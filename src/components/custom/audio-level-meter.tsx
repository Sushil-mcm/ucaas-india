import { useMemo } from 'react';
import { Mic } from 'lucide-react';
import CustomTooltip from '@/components/custom/custom-tooltip';

interface AudioLevelMeterProps {
  audioLevel: number; // 0-30 scale from Jitsi
  className?: string;
}

const AudioLevelMeter = ({ audioLevel = 0, className = '' }: AudioLevelMeterProps) => {
  // Enhanced audio level calculation with better sensitivity
  const amplifiedLevel = useMemo(() => {
    const normalized = audioLevel / 30;
    const amplified = Math.pow(normalized, 0.7) * 100;
    return Math.min(100, amplified * 1.5);
  }, [audioLevel]);

  // Calculate active bars (out of 8 for compact design)
  const activeBars = useMemo(() => {
    return Math.ceil((amplifiedLevel / 100) * 8);
  }, [amplifiedLevel]);

  // Modern gradient colors with glow effect (adjusted for 8 bars)
  const getBarStyle = (barIndex: number) => {
    const isActive = barIndex < activeBars;

    if (!isActive) {
      return {
        backgroundColor: 'rgba(100, 116, 139, 0.2)',
        boxShadow: 'none',
      };
    }

    // Create vibrant gradient effect based on position (8 bars total)
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

  // Pulsing animation for active state
  const isActive = amplifiedLevel > 5;

  return (
    <CustomTooltip text={`Audio Level: ${Math.round(amplifiedLevel)}%`} side="top">
      <div className={`group relative ${className}`}>
        {/* Main container - compact size matching name badge */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1 bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 rounded-full backdrop-blur-xl border border-white/10 shadow-lg">
          {/* Animated microphone icon */}
          <div className="relative">
            <Mic
              className={`w-3 h-3 transition-all duration-300 ${
                isActive
                  ? 'text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]'
                  : 'text-gray-400'
              }`}
            />
            {/* Pulse ring effect when active */}
            {isActive && (
              <div className="absolute inset-0 animate-ping">
                <Mic className="w-3 h-3 text-emerald-400 opacity-20" />
              </div>
            )}
          </div>

          {/* Audio bars with modern design - compact version */}
          <div className="flex items-end gap-0.5 h-4">
            {[...Array(8)].map((_, index) => {
              const barHeight = 4 + index * 1.5; // Heights from 4px to 14.5px (compact)
              const isBarActive = index < activeBars;

              return (
                <div
                  key={index}
                  className="relative w-0.5 rounded-full transition-all duration-150 ease-out"
                  style={{
                    height: `${barHeight}px`,
                    ...getBarStyle(index),
                    transform: isBarActive ? 'scaleY(1)' : 'scaleY(0.4)',
                    opacity: isBarActive ? 1 : 0.25,
                  }}
                >
                  {/* Top glow for active bars */}
                  {isBarActive && (
                    <div
                      className="absolute -top-0.5 left-0 right-0 h-1 blur-sm opacity-60"
                      style={getBarStyle(index)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Outer glow effect when speaking */}
        {isActive && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/20 to-ucass-active/20 blur-md -z-10 animate-pulse" />
        )}
      </div>
    </CustomTooltip>
  );
};

export default AudioLevelMeter;
