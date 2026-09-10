import { Icon } from '@/assets/icons/icon';
import { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  readOnly?: boolean;
  /* Read by screen readers: "Accounting rating". */
  label?: string;
  className?: string;
}

/* One to five stars. Clicking the star that is already lit clears the
   rating, so a person can be taken off a skill without a separate control.
   Keyboard: arrows move, Delete/Backspace clears. */
const StarRating = ({ value, onChange, max = 5, readOnly = false, label, className = '' }: StarRatingProps) => {
  const [hover, setHover] = useState<number>(0);
  const shown = hover || value || 0;

  const set = (next: number) => {
    if (readOnly || !onChange) return;
    onChange(next === value ? 0 : next);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly || !onChange) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(Math.min(max, (value || 0) + 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(Math.max(0, (value || 0) - 1));
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      onChange(0);
    }
  };

  return (
    <div
      role={readOnly ? 'img' : 'slider'}
      aria-label={label ? `${label} rating` : 'Rating'}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value || 0}
      aria-valuetext={value ? `${value} of ${max} stars` : 'Not rated'}
      tabIndex={readOnly ? -1 : 0}
      onKeyDown={onKeyDown}
      onMouseLeave={() => setHover(0)}
      className={`inline-flex items-center gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        readOnly ? '' : 'cursor-pointer'
      } ${className}`}
      title={readOnly ? undefined : value ? 'Click the lit star again to clear' : 'Click a star to rate'}
    >
      {Array.from({ length: max }, (_, index) => {
        const star = index + 1;
        const lit = star <= shown;
        return (
          <span
            key={star}
            aria-hidden="true"
            onMouseEnter={() => !readOnly && setHover(star)}
            onClick={() => set(star)}
            className={`transition-colors ${lit ? 'text-amber-400' : 'text-gray-300'} ${
              readOnly ? '' : 'hover:scale-110'
            }`}
          >
            <Icon name="Star" className="w-5 h-5" />
          </span>
        );
      })}
      <span className="sr-only">{value ? `${value} of ${max}` : 'Not rated'}</span>
    </div>
  );
};

export default StarRating;
