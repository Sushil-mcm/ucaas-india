import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { capitalizeFirstLetter, handleAlert } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { updateGreeting } from '@/services/api';
import Loader from '@/components/custom/loader';
import { CloseIcon } from '@/assets/icons';

const initialState = {
  name: '',
};

const EditGreeting = ({ modalState, setModalState, initialData = null }: any) => {
  const queryClient = useQueryClient();
  const { register, watch, setValue, handleSubmit } = useForm({
    defaultValues: initialState,
  });

  const { mutate: mutateEditGreeting, isPending } = useMutation({
    mutationFn: updateGreeting,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['greetingList'] });
      setModalState(false);
      handleAlert({ text: data?.data?.message || 'Record updated successfully', type: 'success' });
    },
  });

  useEffect(() => {
    if (initialData) {
      setValue('name', capitalizeFirstLetter(initialData?.name));
    }
  }, [initialData, setValue]);

  const handleSubmitUser = () => {
    mutateEditGreeting({
      greeting_uuid: initialData?.uuid,
      name: watch('name'),
    });
  };

  return (
    <Dialog open={modalState} onOpenChange={setModalState}>
      <DialogContent className="sm:w-2/3 md:w-1/3 lg:w-1/4 p-3 w-full" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Edit Greeting
            <div
              onClick={() => setModalState(false)}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit(handleSubmitUser)} className="flex flex-col gap-4">
          <Input {...register('name')} label="Name" placeholder="Enter name" maxLength={50} />

          <div className="flex justify-end gap-2   w-full">
            <Button variant={'transparent'} onClick={() => setModalState(false)} type="button">
              Cancel
            </Button>
            <Button variant={'primary'} type="submit">
              {isPending ? (
                <div className="flex items-center justify-center p-5">
                  <Loader variant="blue" size="sm" />
                </div>
              ) : (
                'Update'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditGreeting;
