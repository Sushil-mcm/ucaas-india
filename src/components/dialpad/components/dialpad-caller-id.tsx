import { ChevronDown, ChevronUp, Info, Phone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CallerIdOption } from '../types';
import DialpadCallerIdConfirmDialog from './dialpad-caller-id-confirm-dialog';
import NumberWithFlag from '@/components/custom/number-with-flag';
import { handleAlert } from '@/lib/utils';

type DialpadCallerIdProps = {
  options: CallerIdOption[];
  selectedOption: CallerIdOption;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (option: CallerIdOption) => void;
  onOpenGuide: () => void;
};

const DialpadCallerId = ({
  options,
  selectedOption,
  isOpen,
  onToggle,
  onSelect,
  onOpenGuide,
}: DialpadCallerIdProps) => {
  const [pendingOption, setPendingOption] = useState<CallerIdOption | null>(null);
  const callerIdRef = useRef<HTMLDivElement>(null);
  const isNoCallerIdOption = (option?: CallerIdOption | null) => {
    const optionId = String(option?.id || '').toLowerCase();
    const optionNumber = String(option?.number || '')
      .trim()
      .toLowerCase();

    return optionId === 'no-caller-id' || optionNumber === 'no caller id';
  };
  const closeDropdown = () => {
    if (isOpen) onToggle();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!callerIdRef.current?.contains(event.target as Node)) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const normalizeCountry = (country = '') => {
    const value = country.trim().toUpperCase();

    if (['UNITED STATES', 'USA', 'US'].includes(value)) {
      return 'US';
    }

    return country;
  };
  const handleCancelCallerIdChange = () => {
    setPendingOption(null);
  };

  const handleConfirmCallerIdChange = () => {
    if (!pendingOption) return;
    onSelect(pendingOption);
    setPendingOption(null);
  };

  const handleSelectCallerId = (option: CallerIdOption) => {
    const isDifferentSelection = option.id !== selectedOption.id;
    if (!isDifferentSelection) {
      if (isNoCallerIdOption(option)) {
        handleAlert({ text: 'No caller id', type: 'info' });
        closeDropdown();
        return;
      }

      handleAlert({ text: 'This DID is already selected', type: 'info' });
      closeDropdown();
      return;
    }

    closeDropdown();
    setPendingOption(option);
  };

  return (
    <>
      <div className="mb-2 flex items-center justify-between px-1 max-[380px]:mb-1.5 sm:mb-0.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#4d5f7f] max-[380px]:text-[8.5px] sm:text-[11px] md:text-[10px] xl:text-[11px]">
          Caller ID
        </h2>
        <button
          type="button"
          onClick={onOpenGuide}
          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary max-[380px]:text-[8.5px] sm:text-[11px] md:text-[10px] xl:text-[11px]"
        >
          <Info className="h-3.5 w-3.5 max-[380px]:h-3 max-[380px]:w-3" />
          Guide
        </button>
      </div>

      <div ref={callerIdRef} className="relative mb-3 max-[380px]:mb-2 sm:mb-3 xl:mb-5 px-0.5">
        <button
          type="button"
          onClick={onToggle}
          className={`w-full rounded-2xl border bg-white p-1.5 text-left shadow-sm transition max-[380px]:p-[5px] sm:p-2 md:p-[6px] xl:p-2.5 ${
            isOpen
              ? 'border-[#8ec0ff] ring-2 ring-[#8ec0ff]/40'
              : 'border-[#e4e9f2] hover:border-[#cad6ea]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-[0_4px_9px_rgba(15,106,231,0.35)] max-[380px]:h-7 max-[380px]:w-7 sm:h-7 sm:w-7 lg:h-7 lg:w-7 xl:w-10 xl:h-10">
                <Phone className="h-3.5 w-3.5 max-[380px]:h-2.5 max-[380px]:w-2.5 sm:h-3.5 sm:w-3.5 xl:w-4 xl:h-4" />
              </span>
              <div className="leading-none">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#73839c] max-[380px]:text-[8.5px] sm:text-[11px] md:text-[11px]">
                  {selectedOption.label} - {normalizeCountry(selectedOption.country)}
                </p>
                <p className="mt-0.5 truncate text-[13px] font-semibold tracking-tight text-[#1d5fd9] max-[380px]:text-[10px] sm:mt-1 sm:text-[12px] md:text-[14px] lg:text-[14px] xl:text-[18px]">
                  <NumberWithFlag number={selectedOption.number} />
                </p>
              </div>
            </div>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#edf3ff] text-primary max-[380px]:h-5 max-[380px]:w-5 sm:h-7 sm:w-7">
              {isOpen ? (
                <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
            </span>
          </div>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 z-20 mt-2 max-h-[min(52vh,260px)] overflow-y-auto overscroll-contain rounded-2xl border border-ucass-active-bg bg-white shadow-[0_16px_28px_rgba(25,42,70,0.18)]">
            {options.map((option, index) => {
              const isSelected = selectedOption.id === option.id;

              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => handleSelectCallerId(option)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition max-[380px]:gap-1.5 max-[380px]:px-2.5 max-[380px]:py-2 sm:gap-2.5 sm:px-4 sm:py-3 ${
                    isSelected ? 'bg-[#f1f6ff]' : 'hover:bg-[#f8fafe]'
                  } ${index !== options.length - 1 ? 'border-b border-[#edf1f8]' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[13px] font-semibold max-[380px]:text-xs sm:text-sm ${isSelected ? 'text-[#1166e8]' : 'text-[#1c2940]'}`}
                    >
                      {option.label}
                    </p>
                    <p className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-[#7d8ea8] max-[380px]:text-[10px] sm:text-xs">
                      <span className="shrink-0">{normalizeCountry(option.country)} -</span>
                      <span className="min-w-0 truncate">
                        <NumberWithFlag number={option.number} />
                      </span>
                    </p>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${isSelected ? 'bg-[#1672f5]' : 'bg-transparent'}`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <DialpadCallerIdConfirmDialog
        open={Boolean(pendingOption)}
        currentOption={selectedOption}
        nextOption={pendingOption}
        onCancel={handleCancelCallerIdChange}
        onConfirm={handleConfirmCallerIdChange}
      />
    </>
  );
};

export default DialpadCallerId;
