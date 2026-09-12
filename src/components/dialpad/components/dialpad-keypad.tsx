import type { DialpadKey } from '../types';
import DialpadKeyButton from './dialpad-key';

type DialpadKeypadProps = {
  keys: DialpadKey[];
  onPressKey: (value: string) => void;
  disabled?: boolean;
  /* Full-page campaign dialer: the console's grid of rounded rectangles, in an
     even 8px grid, instead of the small circles the floating dialer uses. */
  wide?: boolean;
};

const DialpadKeypad = ({ keys, onPressKey, disabled = false, wide = false }: DialpadKeypadProps) => {
  return (
    <div
      className={
        wide
          ? 'grid grid-cols-3 gap-2'
          : 'grid grid-cols-3 gap-x-1.5 gap-y-1.5 px-0 max-[380px]:gap-x-1 max-[380px]:gap-y-1 sm:gap-x-2.5 sm:gap-y-2 sm:px-1 md:gap-x-3 md:gap-y-2.5 xl:gap-x-4 xl:gap-y-3 lg:px-3 lg:max-w-80 lg:mx-auto '
      }
    >
      {keys.map((item) => (
        <DialpadKeyButton
          key={item.value}
          item={item}
          onPress={onPressKey}
          disabled={disabled}
          wide={wide}
        />
      ))}
    </div>
  );
};

export default DialpadKeypad;
