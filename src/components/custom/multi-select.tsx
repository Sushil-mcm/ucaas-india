import { Icon } from '@/assets/icons/icon';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ErrorTooltip from './error-tooltip';
import { Input } from '@/components/ui/input';
import { IMultiOption, MultiSelectProps } from '@/interfaces/common-interface';

const MultiSelect: React.FC<MultiSelectProps> = ({
  label = 'Select',
  error,
  options,
  value = [],
  isValueShown = false,
  onChange = () => {},
  isSearch = false,
  isSearchOnLabel = false,
  placeholder = 'Select an option',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<IMultiOption[]>(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (JSON.stringify(selectedOptions) !== JSON.stringify(value)) {
      setSelectedOptions(value);
    }
  }, [value]);

  const handleSelect = (option: IMultiOption) => {
    if (option?.disabled) return;

    let updatedOptions;
    if (selectedOptions?.some((item) => item?.label === option?.label)) {
      updatedOptions = selectedOptions?.filter((item) => item?.label !== option?.label);
    } else {
      updatedOptions = [...selectedOptions, option];
    }
    setSelectedOptions(updatedOptions);
    onChange(updatedOptions);
  };

  const handleRemove = () => {
    setSelectedOptions([]);
    onChange([]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredOptions = useMemo(() => {
    if (!isSearch) return options;
    return options?.filter((item) => item?.label?.toLowerCase()?.includes(search?.toLowerCase()));
  }, [search, options, isSearch]);

  return (
    <div className="flex flex-col gap-1.5 w-full" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        {label && (
          <label className="flex items-center  text-grey-900 font-medium text-sm leading-none">
            {label}
          </label>
        )}
        {error && <ErrorTooltip text={error} />}
      </div>
      <div className="relative inline-block text-left w-full">
        <div
          className={`${
            error ? 'border-red-500 focus:border-red-500' : 'border-grey-400 hover:border-primary'
          } flex justify-between items-center w-full bg-white border border-gray-300 text-grey-700 hover:bg-white  px-1 font-normal min-h-10 rounded-lg cursor-pointer `}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex gap-2 max-h-9 overflow-auto flex-wrap">
            {selectedOptions?.length > 0 ? (
              <div className="flex items-center rounded-md bg-gray-100 px-2 py-1 text-sm font-medium text-gray-500 gap-2 capitalize w-full whitespace-nowrap">
                {' '}
                {selectedOptions?.length} {selectedOptions?.length === 1 ? 'value' : 'values'}{' '}
                selected
                <button
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="text-red-500 hover:text-red-500/80 cursor-pointer"
                >
                  <Icon name="CloseIcon" className="w-2 h-2" />
                </button>
              </div>
            ) : (
              <p className="whitespace-nowrap pl-2 text-gray-900/80 text-sm">{placeholder}</p>
            )}
          </div>
          <Icon name="ChevronIcon" className="w-5 h-5" />
        </div>

        {isOpen && (
          <div className="p-2 absolute mt-2 origin-top-right rounded-md bg-white shadow-lg focus:outline-none border border-primary max-h-40 overflow-y-auto z-[99] w-full">
            <div className="w-full">
              {isSearch && (
                <Input
                  placeholder="Search"
                  className="pl-10 w-full"
                  IconPosition="left-0 pl-2 inset-y-0"
                  value={search}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.startsWith(' ')) return;
                    setSearch(e.target.value);
                  }}
                  Icon={<Icon name="SearchLine" className=" text-gray-700" />}
                />
              )}

              {selectedOptions?.length > 0 && (
                <>
                  {selectedOptions?.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center px-3 py-1 text-grey-900  gap-2 cursor-pointer"
                      onClick={() => handleSelect(option)}
                    >
                      <input
                        type="checkbox"
                        checked={true}
                        readOnly
                        className="w-4 min-w-4 h-4 accent-primary cursor-pointer"
                      />
                      <p className="text-sm whitespace-nowrap">
                        {option?.label} {isValueShown && `(${option?.value})`}
                      </p>
                    </div>
                  ))}
                </>
              )}

              {filteredOptions?.length > 0 ? (
                filteredOptions
                  .filter(
                    (option) =>
                      !selectedOptions.some((item) =>
                        isSearchOnLabel
                          ? item.label.toLowerCase() === option.label.toLowerCase()
                          : item.value === option.value,
                      ),
                  )
                  .map((option, index) => (
                    <div
                      key={index}
                      className="flex items-center px-3 py-1 text-grey-900  gap-2 cursor-pointer"
                      onClick={() => handleSelect(option)}
                    >
                      <input
                        type="checkbox"
                        checked={false}
                        readOnly
                        className="w-4 min-w-4 h-4 accent-primary cursor-pointer"
                      />
                      <p className="text-sm">
                        {option?.label}
                        {isValueShown && `(${option?.value})`}
                      </p>
                    </div>
                  ))
              ) : (
                <p className=" flex p-2 items-center text-grey-500">No data found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelect;
