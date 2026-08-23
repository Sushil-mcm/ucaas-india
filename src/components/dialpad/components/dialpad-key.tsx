import type { DialpadKey } from '../types';

type DialpadKeyProps = {
  item: DialpadKey;
  onPress: (value: string) => void;
  disabled?: boolean;
};

const DialpadKeyButton = ({ item, onPress, disabled = false }: DialpadKeyProps) => {
  const hasLetters = Boolean(item.letters?.trim());

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPress(item.value)}
      className={`group flex aspect-square w-full max-w-[42px] items-center justify-center justify-self-center rounded-full text-[#2a4362] shadow-[0_4px_8px_rgba(33,56,90,0.08)] transition duration-150 max-[380px]:max-w-[40px] sm:max-w-[46px] md:max-w-[50px] xl:max-w-[54px] xxl:max-w-[70px] ${
        disabled
          ? 'cursor-not-allowed bg-[#e3eaf6] text-[#93a3bb]'
          : 'bg-ucass-active-bg hover:bg-[#e8eef7] active:scale-95'
      }`}
    >
      <span
        className={
          hasLetters
            ? 'flex flex-col items-center leading-none'
            : 'flex items-center justify-center leading-none'
        }
      >
        <span className="text-[20px] font-light max-[380px]:text-[17px] sm:text-[17px] md:text-[17px] xl:text-[24px] xxl:text-[28px]">
          {item.value}
        </span>
        {hasLetters ? (
          <span className="mt-0.5 min-h-[9px] text-[7px] font-semibold tracking-[0.16em] text-[#8f9ebb] max-[380px]:mt-0 max-[380px]:min-h-[8px] max-[380px]:text-[6px] max-[380px]:tracking-[0.14em] sm:mt-1 sm:text-[8px] sm:tracking-[0.18em] md:text-[9px] xl:mt-1.5 xl:text-[10px] xxl:text-[11px] lg:tracking-[0.2em]">
            {item.letters}
          </span>
        ) : null}
      </span>
    </button>
  );
};

export default DialpadKeyButton;
