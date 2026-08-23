import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { CalendarIcon } from '@/assets/icons';
import { Calendar } from '../ui/calendar';
import moment from 'moment';
import { Label } from '../ui/label';
import ErrorTooltip from './error-tooltip';

interface CustomDatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  label?: React.ReactNode;
  error?: any;
}

export function CustomDatePicker({
  value,
  onChange = () => {},
  placeholder = 'Pick a date',
  disabled = false,
  minDate,
  label = null,
  error = '',
}: CustomDatePickerProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {(label || error) && (
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          <div className="flex items-start ">{error && <ErrorTooltip text={error} />}</div>
        </div>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-between text-left font-normal p-0 border-gray-300 hover:bg-white hover:border-primary hover:text-gray-900 gap-2',
              !value && 'text-gray-900',
            )}
          >
            {value ? moment(value).format('YYYY-MM-DD') : <span>{placeholder}</span>}
            <CalendarIcon className="w-5 h-5 text-primary" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={new Date(value || '') as Date}
            onSelect={onChange}
            initialFocus
            disabled={(date) => {
              if (minDate) {
                return moment(date).isBefore(moment(minDate).startOf('day'));
              }
              return false;
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
