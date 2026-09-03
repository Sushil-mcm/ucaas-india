import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { cn } from '@/lib/utils';
import { isValidElement, useCallback, useEffect, useMemo, useState } from 'react';
import Select, { components } from 'react-select';
import { Label } from '../ui/label';
import ErrorTooltip from './error-tooltip';
import { Checkbox } from '../ui/checkbox';

interface CustomSelectType {
  options?: any;
  value?: ISELECTVALUE | null | any;
  handleChange?: (option: ISELECTVALUE | null | any) => void;
  isError?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  isMulti?: boolean;
  isDisabled?: boolean;
  error?: any;
  FormatOptionLabel?: any;
  className?: string;
  inputClass?: string;
  menuPlacement?: 'auto' | 'top' | 'bottom';
  isClearable?: boolean;
  menuPortalTarget?: HTMLElement | null | boolean;
  onMenuScrollToBottom?: () => void;
  onInputChange?: (value: string) => void;
  /** false turns this into a plain click-to-pick dropdown with no typing
   *  cursor in it - for a short fixed list (like a date-range preset) where
   *  search only adds a text-entry affordance nobody needs. Defaults to
   *  true so every other existing usage keeps its current searchable
   *  behaviour. */
  isSearchable?: boolean;
}

const SELECT_PAGE_SIZE = 25;

const toOptionsArray = (input: any): any[] => {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.rows)) return input.rows;
  if (Array.isArray(input?.result?.rows)) return input.result.rows;
  if (Array.isArray(input?.data?.rows)) return input.data.rows;
  return [];
};

const normalizeOption = (option: any, index: number) => {
  if (option === null || option === undefined) return null;

  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    const value = String(option);
    return { label: value, value, _index: index };
  }

  if (typeof option === 'object') {
    const label = option?.label ?? option?.name ?? option?.title ?? option?.text ?? option?.value;
    const value =
      option?.value ?? option?.id ?? option?.uuid ?? option?.key ?? option?.label ?? option?.name;

    if (typeof option?.label !== 'undefined' && typeof option?.value !== 'undefined') {
      return option;
    }

    return {
      ...option,
      label: typeof label === 'undefined' ? '---' : label,
      value: typeof value === 'undefined' ? `option-${index}` : value,
    };
  }

  return null;
};

const CustomSelect = ({
  className,
  options = [],
  value,
  handleChange,
  isMulti = false,
  isLoading = false,
  isDisabled = false,
  placeholder = 'Select',
  label = null,
  required = false,
  FormatOptionLabel = null,
  error = '',
  inputClass = '',
  menuPlacement = 'auto',
  isClearable = false,
  menuPortalTarget,
  onMenuScrollToBottom,
  onInputChange,
  isSearchable = true,
}: CustomSelectType & { label?: any; required?: boolean }) => {
  const normalizedOptions = useMemo(
    () =>
      toOptionsArray(options)
        .map((option: any, index: number) => normalizeOption(option, index))
        .filter(Boolean),
    [options],
  );
  const [inputValue, setInputValue] = useState('');
  const [visibleOptionCount, setVisibleOptionCount] = useState(SELECT_PAGE_SIZE);
  const usesRemoteSearch = typeof onInputChange === 'function';

  const locallyFilteredOptions = useMemo(() => {
    const normalizedInput = inputValue.trim().toLowerCase();
    if (usesRemoteSearch || !normalizedInput) return normalizedOptions;

    return normalizedOptions.filter((option: any) =>
      Object.values(option || {}).some((fieldValue) => {
        if (!['string', 'number', 'boolean'].includes(typeof fieldValue)) return false;
        return String(fieldValue).toLowerCase().includes(normalizedInput);
      }),
    );
  }, [inputValue, normalizedOptions, usesRemoteSearch]);

  const visibleOptions = useMemo(
    () =>
      usesRemoteSearch ? normalizedOptions : locallyFilteredOptions.slice(0, visibleOptionCount),
    [locallyFilteredOptions, normalizedOptions, usesRemoteSearch, visibleOptionCount],
  );

  useEffect(() => {
    setVisibleOptionCount(SELECT_PAGE_SIZE);
  }, [inputValue]);

  const resolveSingleValue = useCallback(
    (rawValue: any) => {
      if (rawValue === null || typeof rawValue === 'undefined' || rawValue === '') return null;

      if (typeof rawValue === 'object') {
        if (typeof rawValue?.value !== 'undefined') {
          const optionValue = rawValue?.value;
          const optionLabel = rawValue?.label;
          const isEmptyValue =
            optionValue === null ||
            typeof optionValue === 'undefined' ||
            (typeof optionValue === 'string' && optionValue.trim() === '');
          const isPlaceholderLabel =
            typeof optionLabel === 'string' && optionLabel.trim().toLowerCase() === 'select';
          const hasMeaningfulLabel =
            typeof optionLabel === 'string' && optionLabel.trim().length > 0 && !isPlaceholderLabel;

          if (isEmptyValue && !hasMeaningfulLabel) return null;
          if (
            isEmptyValue &&
            !normalizedOptions.some(
              (option: any) =>
                option?.value === optionValue ||
                option?.id === optionValue ||
                option?.uuid === optionValue,
            )
          ) {
            return null;
          }

          return rawValue;
        }
        const lookup = rawValue?.id ?? rawValue?.uuid ?? rawValue?.label ?? rawValue?.name;
        if (typeof lookup === 'undefined') return null;
        return (
          normalizedOptions.find(
            (option: any) =>
              option?.value === lookup || option?.id === lookup || option?.uuid === lookup,
          ) || null
        );
      }

      return (
        normalizedOptions.find(
          (option: any) =>
            option?.value === rawValue || option?.id === rawValue || option?.uuid === rawValue,
        ) || null
      );
    },
    [normalizedOptions],
  );

  const normalizedValue = useMemo(() => {
    if (isMulti) {
      if (!Array.isArray(value)) return [];
      return value.map((item: any) => resolveSingleValue(item)).filter(Boolean);
    }
    return resolveSingleValue(value);
  }, [isMulti, resolveSingleValue, value]);

  const onSelectChange = useCallback(
    (selected: any) => {
      if (typeof handleChange === 'function') {
        handleChange(selected);
      }
    },
    [handleChange],
  );

  const handleInputChange = useCallback(
    (nextValue: string) => {
      setInputValue(nextValue);
      onInputChange?.(nextValue);
      return nextValue;
    },
    [onInputChange],
  );

  const handleMenuScrollToBottom = useCallback(() => {
    if (!usesRemoteSearch && visibleOptionCount < locallyFilteredOptions.length) {
      setVisibleOptionCount((currentCount) =>
        Math.min(currentCount + SELECT_PAGE_SIZE, locallyFilteredOptions.length),
      );
    }
    onMenuScrollToBottom?.();
  }, [locallyFilteredOptions.length, onMenuScrollToBottom, usesRemoteSearch, visibleOptionCount]);

  const formatOptionLabel = useCallback(
    (option: any, { context }: { context: 'menu' | 'value' }) => {
      const isMenu = context === 'menu';
      const isSelected =
        isMulti && Array.isArray(value) && value.some((val: any) => val?.value === option?.value);

      if (typeof FormatOptionLabel === 'function') {
        return (
          <div className="flex items-center gap-2 w-full">
            {isMulti && isMenu && <Checkbox checked={isSelected} className="pointer-events-none" />}
            <FormatOptionLabel option={option} context={context} />
          </div>
        );
      }
      if (isValidElement(FormatOptionLabel)) return FormatOptionLabel;

      return (
        <div className="flex items-center gap-2 w-full">
          {isMulti && isMenu && <Checkbox checked={isSelected} className="pointer-events-none" />}
          {option?.icon && <span>{option?.icon}</span>}
          <span>{option?.label ?? '---'}</span>
        </div>
      );
    },
    [FormatOptionLabel, isMulti, value],
  );

  const selectComponents = useMemo(
    () => ({
      Menu: (props: any) => (
        <components.Menu
          {...props}
          innerProps={{
            ...props.innerProps,
            onWheel: (e: any) => {
              props.innerProps?.onWheel?.(e);
              e.stopPropagation();
            },
          }}
        />
      ),
      MenuList: (props: any) => {
        if (!isMulti) return <components.MenuList {...props} />;

        const { getValue } = props;
        const currentValues = getValue() || [];
        const selectableOptions = usesRemoteSearch ? normalizedOptions : locallyFilteredOptions;
        const selectedValues = new Set(currentValues.map((option: any) => option?.value));
        const allSelected =
          selectableOptions.length > 0 &&
          selectableOptions.every((option: any) => selectedValues.has(option?.value));

        const onClickSelectAll = (e: any) => {
          e.preventDefault();
          e.stopPropagation();
          if (allSelected) {
            props.setValue([], 'deselect-option');
          } else {
            props.setValue(selectableOptions, 'select-option');
          }
        };

        return (
          <components.MenuList {...props}>
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-200 hover:bg-gray-50 text-xs font-semibold text-primary"
              onMouseDown={onClickSelectAll}
            >
              <Checkbox checked={allSelected} className="pointer-events-none" />
              <span>Select All</span>
            </div>
            {props.children}
          </components.MenuList>
        );
      },
    }),
    [isMulti, locallyFilteredOptions, normalizedOptions, usesRemoteSearch],
  );

  const resolvedMenuPortalTarget = useMemo(() => {
    if (menuPortalTarget === false) return undefined;
    if (
      menuPortalTarget &&
      typeof HTMLElement !== 'undefined' &&
      menuPortalTarget instanceof HTMLElement
    ) {
      return menuPortalTarget;
    }
    if (typeof document !== 'undefined') return document.body;
    return undefined;
  }, [menuPortalTarget]);

  const classNamePrefix = useMemo(
    () => `${inputClass || ''} custom-react-select`.trim(),
    [inputClass],
  );

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label || error ? (
        <div className="flex items-center justify-between">
          {label && <Label required={required}>{label}</Label>}
          <div className="flex items-start">{error && <ErrorTooltip text={error} />}</div>
        </div>
      ) : null}
      <div className="flex w-full selectBox">
        <Select
          isDisabled={isDisabled}
          isLoading={isLoading}
          isSearchable={isSearchable}
          isMulti={isMulti}
          closeMenuOnSelect={!isMulti}
          classNamePrefix={classNamePrefix}
          value={normalizedValue}
          onChange={onSelectChange}
          onInputChange={handleInputChange}
          onMenuScrollToBottom={handleMenuScrollToBottom}
          filterOption={null}
          options={visibleOptions}
          placeholder={placeholder}
          className={cn('w-full', error && 'react-select-error')}
          menuPlacement={menuPlacement}
          formatOptionLabel={formatOptionLabel}
          isClearable={isClearable}
          menuPortalTarget={resolvedMenuPortalTarget}
          menuShouldBlockScroll={true}
          menuShouldScrollIntoView={false}
          styles={{
            menuPortal: (base) => ({
              ...base,
              zIndex: 9999,
              pointerEvents: 'auto',
            }),
            menu: (base) => ({
              ...base,
              zIndex: 9999,
            }),
          }}
          components={selectComponents}
        />
      </div>
    </div>
  );
};

export default CustomSelect;
