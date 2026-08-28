import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FC, useEffect } from 'react';
import { Button } from '@/components/ui/button';

import { CloseIcon } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as yup from 'yup';
import { requiredString } from '@/lib/schema';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { handleAlert } from '@/lib/utils';
import { upsertDispositions } from '@/services/api';

const DispositionSchema = yup.object().shape({
  name: requiredString('Name', 2, 50),
  description: requiredString('Description', 2, 500),
});

interface DispositionProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  editdata?: any;
}
const DispositionModal: FC<DispositionProps> = ({ modalState, setModalState, editdata }) => {
  const queryClient: any = useQueryClient();
  const {
    handleSubmit,
    register,
    setValue,
    formState: { errors },
  } = useForm<any>({
    defaultValues: {
      name: '',
      description: '',
    },
    resolver: yupResolver(DispositionSchema),
    mode: 'onChange',
  });

  const { mutate: mutateUpsertDisposition, isPending: isPendingAddDisposition } = useMutation({
    mutationFn: upsertDispositions,
    onSuccess: () => {
      handleAlert({ text: 'Disposition upsert successfully!', type: 'success' });
      queryClient.invalidateQueries(['getDispositionsList'], { exact: true });
      setModalState(false);
    },
  });

  const onSubmit = (data: any) => {
    const payload = {
      dispositionType: 'AGENT',
      disposition: {
        name: data?.name,
        description: data?.description,
      },
      ...(editdata && { uuid: editdata?._id }),
    };

    mutateUpsertDisposition(payload);
  };

  useEffect(() => {
    setValue('description', editdata?.disposition?.description);
    setValue('name', editdata?.disposition?.name);

    return () => {};
  }, []);

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
              {editdata ? 'Update Disposition' : 'Add Disposition'}
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
            <div className="flex flex-col gap-4 w-full">
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center justify-between">
                  <Label>Description</Label>
                  <div className="flex items-start ">
                    {(errors?.description as any)?.message && (
                      <ErrorTooltip text={(errors?.description as any)?.message} />
                    )}
                  </div>
                </div>
                <textarea
                  rows={3}
                  className={`border rounded-xl text-sm resize-none p-3 
  ${
    errors?.description?.message
      ? 'border-red-300 hover:border-red-300 focus:border-red-300 focus-visible:border-red-300'
      : 'border-gray-300 hover:border-primary focus:border-primary focus-visible:border-primary'
  } 
  focus-visible:outline-none`}
                  placeholder="Enter description"
                  {...register('description')}
                  maxLength={501}
                />
              </div>
            </div>
          </div>
          <div className="justify-end flex gap-2">
            <Button variant={'transparent'} type="button" onClick={() => setModalState(false)}>
              Cancel
            </Button>
            <Button variant={'primary'} type="submit" disabled={isPendingAddDisposition}>
              {isPendingAddDisposition ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
        {/* <DialogFooter>
            <div className="justify-end flex gap-2">
              <Button variant={'transparent'} type="button" onClick={() => setModalState(false)}>
                Cancel
              </Button>
              <Button variant={'primary'} type="submit" disabled={isPendingAddDisposition}>
                {isPendingAddDisposition ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
};

export default DispositionModal;
