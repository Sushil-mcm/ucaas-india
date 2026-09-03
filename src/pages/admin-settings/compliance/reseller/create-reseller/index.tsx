import { CloseIcon } from '@/assets/icons';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Controller, useForm } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resellerCreate } from '@/services/api';
import { handleAlert } from '@/lib/utils';

const validationSchema = yup.object().shape({
  companyName: yup.string().required('Company name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),

  phone: yup.string().required('Mobile phone required').min(6, 'Phone number too short'),
});

const CreateReseller = ({
  modalOpen,
  handleClose,
  setModalOpen,
}: {
  modalOpen: boolean;
  handleClose: () => void;
  setModalOpen: (val: boolean) => void;
}) => {
  const queryClient: any = useQueryClient();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    defaultValues: {
      companyName: '',
      email: '',
      phone: '',
    },
    resolver: yupResolver(validationSchema),
    mode: 'onChange',
  });

  const { mutate, isPending } = useMutation({
    mutationFn: resellerCreate,
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries(['getUsersDetails'], {
        exact: true,
      });
      handleAlert({
        text: data?.data?.message,
        type: 'success',
      });
      handleClose();
    },
  });
  const onSubmit = (values: any) => {
    // API CALL HERE
    mutate(values);
  };

  return (
    <Dialog open={!!modalOpen} onOpenChange={(val) => !val && setModalOpen(false)}>
      <DialogContent
        className="sm:w-1/2 w-full p-3 max-h-[99%] overflow-auto"
        showCloseButton={false}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5  text-900/80">
            <div className="font-semibold truncate text-md flex items-center justify-between">
              Reseller Details
              <div
                onClick={handleClose}
                className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
              >
                <CloseIcon className="w-3 h-3" />
              </div>
            </div>

            <div className="grid grid-cols-2 w-full gap-4 mt-3">
              <Input
                label="Legal Company Name"
                {...register('companyName')}
                error={errors?.companyName?.message}
              />

              <Input label="Email" {...register('email')} error={errors?.email?.message} />

              {/* PHONE INPUT FIELD */}
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center justify-between">
                  <Label>Mobile Phone</Label>

                  <div className="flex items-start">
                    {errors?.phone?.message && <ErrorTooltip text={errors?.phone?.message} />}
                  </div>
                </div>

                <div className="flex gap-1">
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <PhoneInput
                        {...field}
                        country={'us'}
                        countryCodeEditable={false}
                        containerClass={errors?.phone?.message ? 'phone-error' : ''}
                        onChange={(value) => field.onChange(value)}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="justify-end flex gap-2">
              <Button variant={'transparent'} type="button" onClick={handleClose}>
                Cancel
              </Button>

              <Button variant={'primary'} type="submit" disabled={isPending}>
                Submit
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateReseller;
