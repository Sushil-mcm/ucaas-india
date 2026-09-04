import { ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type DidOption = {
  label: string;
  value: string;
  /** 1-based position in the user's own list of numbers. */
  line?: number;
  icon?: React.ReactNode;
};

/**
 * The sending-number control: which of your own numbers a message goes out on.
 *
 * Two buttons rather than a dropdown. With a handful of numbers, stepping to
 * the next one is the common move and it should cost a single click; picking a
 * specific one is rarer and gets the list. It also drops react-select here,
 * whose control is styled by an emotion class this page kept having to fight
 * -- these are plain buttons.
 *
 * The face shows the line's position, not the number: a full +91XXXXXXXXXXX in
 * a header corner is thirteen digits nobody reads. The list spells each one out
 * so the short form stays learnable from the thing it stands for.
 */
const DidPicker = ({
  options = [],
  value,
  onChange,
  className,
}: {
  options?: DidOption[];
  value: any;
  onChange?: (value: any) => void;
  className?: string;
}) => {
  if (!onChange || options.length === 0) return null;

  const index = options.findIndex((option) => option?.value === value?.value);
  const current = index >= 0 ? options[index] : undefined;
  const line = current?.line ?? '-';

  /* Wraps, so the button never dead-ends on the last number. */
  const goToNext = () => {
    if (options.length < 2) return;
    onChange(options[(Math.max(index, 0) + 1) % options.length]);
  };

  const onlyOne = options.length < 2;

  return (
    <div className={cn('mcm-linepick', className)}>
      <button
        type="button"
        className="mcm-linepick-face"
        onClick={goToNext}
        disabled={onlyOne}
        title={
          onlyOne
            ? `Sending from ${current?.label || 'your number'}`
            : `Sending from ${current?.label || 'your number'} — click for the next number`
        }
        aria-label={`Sending from line ${line}${onlyOne ? '' : '. Switch to the next number'}`}
      >
        {/* The word earns its width. A bare number with a caret says nothing
            about what it is or that it can be changed -- the tooltip only
            helps someone who already suspected there was something here. */}
        <span className="mcm-linepick-label">From</span>
        <span className="mcm-linepick-n mcm-num">{line}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="mcm-linepick-more"
            title="Choose a sending number"
            aria-label="Choose a sending number"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="mcm-linepick-menu min-w-56">
          {options.map((option) => {
            const isCurrent = option?.value === value?.value;
            return (
              <DropdownMenuItem
                key={option.value}
                className="mcm-linepick-item"
                onClick={() => onChange(option)}
              >
                <span className="mcm-linepick-n mcm-num">{option.line}</span>
                <span className="mcm-num flex-1 truncate">{option.label}</span>
                {isCurrent ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default DidPicker;
