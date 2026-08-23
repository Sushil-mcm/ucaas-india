import type { DialpadSession } from '@/context/dialpad-context';
import { KEYPAD_KEYS } from '../constants';
import { ChevronLeft, Delete } from 'lucide-react';
import { useMemo, useState } from 'react';

type DialpadDTMFPanelProps = {
  session: DialpadSession | null;
  onBack: () => void;
  onSendDtmf: (value: string) => void;
};

const DTMF_MAX_PREVIEW_LENGTH = 64;
const connectedActionButtonBase =
  'border border-ucass-active-bg bg-ucass-active-bg text-[#224162] shadow-[0_4px_8px_rgba(33,56,90,0.08)] transition hover:bg-primary hover:text-white hover:border-primary';

const DialpadDTMFPanel = ({ session, onBack, onSendDtmf }: DialpadDTMFPanelProps) => {
  const [dtmfValue, setDtmfValue] = useState('');

  const canSendDtmf = Boolean(session?.id);

  const maskedDtmfValue = useMemo(() => {
    if (!dtmfValue) return '';
    if (dtmfValue.length <= DTMF_MAX_PREVIEW_LENGTH) return dtmfValue;
    return dtmfValue.slice(-DTMF_MAX_PREVIEW_LENGTH);
  }, [dtmfValue]);

  const handlePressDtmfKey = (value: string) => {
    if (!canSendDtmf) return;

    setDtmfValue((previousValue) => `${previousValue}${value}`);
    onSendDtmf(value);
  };

  const handleBackspace = () => {
    setDtmfValue((previousValue) => previousValue.slice(0, -1));
  };

  const handleClear = () => {
    setDtmfValue('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col w-full">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#2d466b] transition max-[380px]:px-1.5 max-[380px]:py-0.5 max-[380px]:text-[10px] sm:px-2.5 sm:py-1.5 sm:text-xs md:text-[13px] hover:bg-[#edf3ff]"
        >
          <ChevronLeft className="h-3.5 w-3.5 max-[380px]:h-3 max-[380px]:w-3 sm:h-4 sm:w-4" />
          Back
        </button>
      </div>

      <div className="mt-2 sm:mt-2.5">
        <div className="relative min-h-[36px] w-full rounded-lg border border-[#d2ddef] bg-white px-2.5 py-2 pr-[84px] text-[11px] font-semibold tracking-[0.06em] text-[#1f2f47] max-[380px]:min-h-[32px] max-[380px]:px-2 max-[380px]:py-1.5 max-[380px]:pr-[72px] max-[380px]:text-[10px] sm:min-h-[38px] sm:px-3 sm:pr-[92px] sm:text-[12px] md:text-[13px]">
          {maskedDtmfValue || 'Tap to send tones'}
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <button
              type="button"
              onClick={handleBackspace}
              disabled={!dtmfValue}
              aria-label="Backspace"
              className={`inline-flex h-6 w-6 items-center justify-center rounded-lg max-[380px]:h-5 max-[380px]:w-5 sm:h-7 sm:w-7 ${connectedActionButtonBase} disabled:cursor-not-allowed disabled:border-[#f2f5fa] disabled:bg-[#f2f5fa] disabled:text-[#93a0b4] disabled:shadow-none`}
            >
              <Delete className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!dtmfValue}
              className={`inline-flex h-6 items-center justify-center rounded-lg px-1.5 text-[8px] font-semibold max-[380px]:h-5 max-[380px]:px-1 max-[380px]:text-[7px] sm:h-7 sm:px-2 sm:text-[9px] ${connectedActionButtonBase} disabled:cursor-not-allowed disabled:border-[#f2f5fa] disabled:bg-[#f2f5fa] disabled:text-[#93a0b4] disabled:shadow-none`}
            >
              Clear
            </button>
          </div>
        </div>

        {!canSendDtmf ? (
          <p className="mt-1 text-[9px] font-medium text-[#9a6270] max-[380px]:text-[8px] sm:text-[10px]">
            Session is unavailable for DTMF.
          </p>
        ) : null}
      </div>

      <div className="mt-2.5 min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y pr-1 sm:mt-3 pb-1">
        <div className="grid grid-cols-3 gap-x-1.5 gap-y-1.5 px-0 max-[380px]:gap-x-1 max-[380px]:gap-y-1 sm:gap-x-2.5 sm:gap-y-2 sm:px-1 md:gap-x-3 md:gap-y-2.5 xl:gap-x-4 xl:gap-y-3 lg:px-3 lg:max-w-80 lg:mx-auto ">
          {KEYPAD_KEYS.map((item) => {
            const hasLetters = Boolean(item.letters?.trim());

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handlePressDtmfKey(item.value)}
                disabled={!canSendDtmf}
                className={`group flex aspect-square w-full max-w-[36px] items-center justify-center justify-self-center rounded-full max-[380px]:max-w-[32px] sm:max-w-[40px] md:max-w-[42px] lg:max-w-[48px] xl:max-w-[52px] ${connectedActionButtonBase} disabled:cursor-not-allowed disabled:border-[#f2f5fa] disabled:bg-[#f2f5fa] disabled:text-[#93a0b4] disabled:shadow-none`}
              >
                <span
                  className={
                    hasLetters
                      ? 'flex flex-col items-center leading-none'
                      : 'flex items-center justify-center leading-none'
                  }
                >
                  <span className="text-[16px] font-light max-[380px]:text-[14px] sm:text-[15px] md:text-[16px] xl:text-[20px]">
                    {item.value}
                  </span>
                  {hasLetters ? (
                    <span className="mt-0.5 min-h-[7px] text-[5px] font-semibold tracking-[0.12em] text-[#8f9ebb] max-[380px]:mt-0 max-[380px]:min-h-[6px] max-[380px]:text-[4.5px] max-[380px]:tracking-[0.1em] sm:mt-0.5 sm:text-[6px] sm:tracking-[0.14em] md:text-[7px] xl:mt-1 xl:text-[8px] lg:tracking-[0.16em] group-hover:text-white group-disabled:text-[#a0adbf]">
                      {item.letters}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DialpadDTMFPanel;
