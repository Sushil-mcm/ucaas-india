import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CloseIcon } from '@/assets/icons';
import { DialogDescription } from '@/components/ui/dialog';
import { crmTypes, initialState, validationSchema } from '../../constant';
import { useEffect } from 'react';
import CustomSelect from '@/components/custom/custom-select';

const AddPathModal = ({
  handleClose,
  editForm,
}: {
  handleClose: () => void;
  editForm: { isEdit: boolean; formData: any };
}) => {
  const { isEdit = false, formData = {} } = editForm || {};

  const formInstance = useForm<any>({
    defaultValues: initialState,
    resolver: yupResolver(validationSchema),
    mode: 'onSubmit',
  });
  const {
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = formInstance;

  // const { mutateAsync: hubspotCRMMutation, isPending } = useMutation({
  //   mutationKey: ['crmIntegration'],
  //   mutationFn: hubspotCRM,
  // });
  useEffect(() => {
    if (isEdit) {
      const { type, path } = formData || {};
      reset(type, path);
    }
  }, [isEdit]);

  const onSubmit = async (values: { path: string; type: string }) => {
    return values;
  };

  return (
    <form
      className="h-full w-full flex flex-col gap-4 justify-between"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-1.5  text-900/80 ">
        <div className="font-semibold truncate text-md flex items-center justify-between">
          Add Webhook path
          <div
            onClick={handleClose}
            className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
          >
            <CloseIcon className="w-3 h-3" />
          </div>
        </div>
      </div>
      <DialogDescription>
        <div className="flex flex-col gap-4 bg-white">
          <div className="w-full">
            <CustomSelect
              label={'Type'}
              options={crmTypes}
              handleChange={(e) => setValue(`type`, e)}
              value={watch('type')}
              error={(errors.type?.message as string) || undefined}
            />
          </div>
          <div className="w-full">
            <Input
              label="Path"
              {...register('path')}
              placeholder="Enter webhook path"
              error={errors?.path?.message}
            />
          </div>
        </div>
      </DialogDescription>
      <div className="flex justify-end gap-2 w-full">
        <Button variant={'transparent'} onClick={handleClose} type="button">
          Cancel
        </Button>
        <Button variant={'outline'} type="submit">
          {/* {isPending ? 'Loading...' : 'Submit'} */}
          Submit
        </Button>
      </div>
    </form>
  );
};

export default AddPathModal;
