import { FC, forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/input';
import CustomSelect from './custom-select';
import { Icon } from '@/assets/icons/icon';
import MultiSelect from './multi-select';

export const transFilterObject = (obj: Record<string, any>) => {
  const result = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && 'value' in obj[key]) {
      result.push({ key, value: obj[key].value });
    } else {
      result.push({ key, value: obj[key] });
    }
  }
  return result?.filter((item) => item?.value);
};

interface CommonFilterProps {
  fields: any;
  onFilterChange: (filters: Record<string, any>) => void;
  handleReset: () => void;
  ref?: any;
  handleFilterSelect?: any;
}

const CommonFilter: FC<CommonFilterProps> = forwardRef(
  ({ fields, onFilterChange, handleReset, handleFilterSelect }, ref) => {
    const { watch, setValue, getValues } = useForm();
    const [formData, setFormData] = useState<Record<string, any>>({});
    // const direction = watch('direction');
    // const type = watch('type');

    useImperativeHandle(ref, () => ({
      getValues: () => getValues(),
      resetForm: () => {
        fields.forEach((f: any) => setValue(f.key, undefined));
        setFormData({});
      },
    }));

    useEffect(() => {
      const subscription = watch((data) => {
        setFormData(data);
        handleFilterSelect(getValues());
      });

      return () => subscription.unsubscribe();
    }, [watch]);

    // useEffect(() => {
    //   if (direction) {
    //     setValue('type', {});
    //   }
    // }, [direction]);

    // useEffect(() => {
    //   if (type) {
    //     setValue('type_value', []);
    //   }
    // }, [type]);

    const handleApply = () => {
      const values = getValues();
      onFilterChange(values);
    };

    const hasActiveFilters = Object.values(formData)?.some((v) =>
      typeof v === 'object' ? v?.value : v,
    );

    return (
      <div className="flex items-center gap-2 w-full p-4 ">
        {fields?.map((field: any) => {
          if (field.type === 'select') {
            if (field.isMulti) {
              return (
                <MultiSelect
                  key={field.key}
                  label={field.label}
                  placeholder={field.placeholder}
                  options={field.options || []}
                  value={watch(field.key) || []}
                  onChange={(val: any) => setValue(field.key, val)}
                  isSearch={true}
                />
              );
            }

            return (
              <CustomSelect
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                options={field.options || []}
                value={watch(field.key)}
                handleChange={(val) => setValue(field.key, val)}
              />
            );
          } else {
            return (
              <Input
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                type={field.type}
                value={watch(field.key) || ''}
                onChange={(e) => {
                  if (field.maxLength) {
                    e.target.value = e.target.value.slice(0, field.maxLength);
                  }
                  setValue(field.key, e.target.value);
                }}
              />
            );
          }
        })}
        <div className="flex items-center gap-2 justify-end mt-4">
          <div
            className="cursor-pointer flex items-center justify-center rounded-full w-9 h-9  bg-green-100   text-green-500 hover:bg-green-400 hover:text-white"
            onClick={handleApply}
          >
            <Icon name="Check" className="w-4 h-4" />
          </div>
          {hasActiveFilters && (
            <div
              className="cursor-pointer flex items-center justify-center rounded-full w-9 h-9 bg-red-100   text-red-500 hover:bg-red-500 hover:text-white"
              onClick={handleReset}
            >
              <Icon name="CloseIcon" className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default CommonFilter;
