import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FC } from 'react';
import { Button } from '@/components/ui/button';

import { CloseIcon } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import * as yup from 'yup';
import { requiredString } from '@/lib/schema';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { handleAlert } from '@/lib/utils';
import { addDncCampaign } from '@/services/api';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { Label } from '@/components/ui/label';
import PhoneInput from 'react-phone-input-2';

const DispositionSchema = yup.object().shape({
  name: requiredString('Name', 2, 50),
  phone: yup.string().required('Phone number is required'),
});

interface DispositionProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  editdata?: any;
}
const AddDncModal: FC<DispositionProps> = ({ modalState, setModalState, editdata }) => {
  const queryClient: any = useQueryClient();
  const {
    handleSubmit,
    register,
    control,
    setValue,
    formState: { errors },
  } = useForm<any>({
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      // countryPrefix: '+1',
    },
    resolver: yupResolver(DispositionSchema),
    mode: 'onChange',
  });

  const { mutate: mutateUpsertDisposition, isPending } = useMutation({
    mutationFn: addDncCampaign,
    onSuccess: () => {
      handleAlert({ text: 'DNC added successfully!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['getPersonalDncList'] });
      setValue('phone', '');
      setValue('name', '');
      setValue('email', '');

      setModalState(false);
    },
  });

  const onSubmit = (data: any) => {
    const payload = {
      phone: data?.phone,
      name: data?.name,
      ...(data?.email ? { email: data?.email } : {}),
    };

    mutateUpsertDisposition(payload);
  };

  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent
        className="sm:w-1/2  md:w-1/4 w-full p-3 max-h-[99%] overflow-y-auto"
        showCloseButton={false}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full flex flex-col gap-3 justify-between h-full"
        >
          <div className="flex flex-col gap-1.5  text-900/80">
            <div className="font-semibold truncate text-md flex items-center justify-between">
              {editdata ? 'Update Personal DNC' : 'Add Personal DNC'}
              <div
                onClick={() => setModalState(false)}
                className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
              >
                <CloseIcon className="w-3 h-3" />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5 w-full">
              <Input
                type="text"
                placeholder="Enter name"
                label="Name"
                {...register('name')}
                error={(errors?.name as any)?.message}
                maxLength={50}
              />
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <Input
                type="text"
                placeholder="Enter email"
                label="Email"
                {...register('email')}
                error={(errors?.email as any)?.message}
              />
            </div>
            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-start justify-between ">
                <Label>Mobile Number</Label>{' '}
                {errors?.phone?.message && <ErrorTooltip text={errors?.phone?.message} />}
              </div>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    {...field}
                    country={'us'}
                    containerClass={errors?.phone?.message ? 'phone-error' : ''}
                  />
                )}
              />
            </div>
          </div>
          <div className="justify-end flex gap-2">
            <Button
              variant={'transparent'}
              type="button"
              onClick={() => {
                setModalState(false);
                setValue('phone', '');
                setValue('name', '');
                setValue('email', '');
              }}
            >
              Cancel
            </Button>
            <Button variant={'outline'} type="submit" disabled={isPending}>
              {isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDncModal;
