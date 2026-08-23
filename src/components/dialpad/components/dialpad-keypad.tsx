import type { DialpadKey } from '../types';
import DialpadKeyButton from './dialpad-key';

type DialpadKeypadProps = {
  keys: DialpadKey[];
  onPressKey: (value: string) => void;
  disabled?: boolean;
};

const DialpadKeypad = ({ keys, onPressKey, disabled = false }: DialpadKeypadProps) => {
  return (
    <div className="grid grid-cols-3 gap-x-1.5 gap-y-1.5 px-0 max-[380px]:gap-x-1 max-[380px]:gap-y-1 sm:gap-x-2.5 sm:gap-y-2 sm:px-1 md:gap-x-3 md:gap-y-2.5 xl:gap-x-4 xl:gap-y-3 lg:px-3 lg:max-w-80 lg:mx-auto ">
      {keys.map((item) => (
        <DialpadKeyButton key={item.value} item={item} onPress={onPressKey} disabled={disabled} />
      ))}
    </div>
  );
};

export default DialpadKeypad;
