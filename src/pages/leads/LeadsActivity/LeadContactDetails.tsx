import CustomAvatar from '@/components/custom/custom-avatar';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/utils';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';

const LeadContactDetails = ({ rowData = {} }: { rowData: any }) => {
  const { createdAt = '', updatedAt = '' } = rowData || {};

  const {
    register,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<any>({
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      gender: null,
      email: '',
      dob: '',
      contact_pic: '',
    },
    mode: 'all',
  });

  useEffect(() => {
    if (rowData && Object.keys(rowData)) {
      const { firstName = '', lastName = '', email = '', phone = '' } = rowData || {};
      reset({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
      });
    }
  }, [rowData]);

  return (
    <form className="p-3 flex flex-col gap-5 w-full border rounded-lg h-full">
      <div className="flex gap-4">
        <label htmlFor="contactImage" className="w-fit h-fit cursor-auto">
          <CustomAvatar
            size="80"
            name={`${watch('first_name')} ${watch('last_name')}`}
            type={'contact'}
            image={
              typeof watch('contact_pic') === 'string'
                ? watch('contact_pic')
                : watch('contact_pic')
                  ? URL.createObjectURL(watch('contact_pic'))
                  : ''
            }
          />
        </label>
        <div className="flex flex-col gap-1 w-[calc(100%_-_4rem)] ">
          <div className="flex justify-between">
            <div className="text-xs">Created at: </div>
            <div className="text-xs">{formatDate(createdAt)}</div>
          </div>
          <div className="flex justify-between">
            <div className="text-xs">Last updated:</div>
            <div className="text-xs">{formatDate(updatedAt)}</div>
          </div>
          {/* <div className="flex justify-between">
            <div className="text-xs">Created by:</div>
            <div className="text-xs">{createdByName}</div>
          </div> */}
        </div>
      </div>

      <div className="flex flex-col gap-5 overflow-auto">
        <div className="flex gap-1 flex-col">
          <Input
            label="First Name"
            disabled
            placeholder="Enter first name"
            {...register('first_name')}
            error={errors?.first_name?.message}
          />
        </div>

        <div className="flex gap-1 flex-col">
          <Input
            label="Last Name"
            disabled
            placeholder="Enter last name"
            {...register('last_name')}
            error={errors?.last_name?.message}
          />
        </div>
        <div className="flex gap-1 flex-col">
          <Input
            label="Email"
            disabled
            placeholder="Enter email"
            type="email"
            {...register('email')}
            error={errors?.email?.message}
          />
        </div>
        <div className="flex gap-1 flex-col">
          <Label>Phone</Label>
          <PhoneInput
            country={'us'}
            value={watch(`phone`)}
            onChange={(phone = '') => setValue('phone', phone, { shouldValidate: true })}
            containerClass={errors?.phone?.message ? 'phone-error' : ''}
            disabled
          />
          {errors?.phone?.message && (
            <div className="flex justify-end">
              <ErrorTooltip text={errors?.phone?.message} />
            </div>
          )}
        </div>
      </div>
    </form>
  );
};

export default LeadContactDetails;
