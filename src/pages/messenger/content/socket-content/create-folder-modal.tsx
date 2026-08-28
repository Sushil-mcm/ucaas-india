import { CloseIcon } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { requiredString } from '@/lib/schema';
import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
const validationSchema = yup.object().shape({
  name: requiredString('Name', 4, 50),
});
const CreateFolderModal = ({ open, setOpen }: any) => {
  const { handleCreateFolder } = useSocketEvents();
  const { user } = useUser();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<any>({
    defaultValues: {
      name: '',
    },
    resolver: yupResolver(validationSchema),
    mode: 'onChange',
  });
  const otherUserData = open?.users?.find((item: any) => item?.uuid !== user?.uuid);

  const onSubmit = (values: { name: string }) => {
    handleCreateFolder({
      chatId: open?.chatId,
      creatorId: user?.uuid,
      receiverId: open?.isGroupChat
        ? open?.users?.map((item: any) => item?.uuid)?.filter((item: any) => item !== user?.uuid)
        : [otherUserData?.uuid],
      folderName: values?.name,
    });

    window.dispatchEvent(new CustomEvent('folderCreated'));
    setOpen(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          reset();
        }
        setOpen(val);
      }}
    >
      <DialogContent
        className="sm:w-1/2 md:w-1/4 p-3"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5  text-900/80">
            <div className="font-semibold truncate text-md flex items-center justify-between">
              Create Folder
              <div
                onClick={() => setOpen(false)}
                className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
              >
                <CloseIcon className="w-3 h-3" />
              </div>
            </div>
          </div>

          <div>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter folder name"
                  error={errors?.name?.message}
                  maxLength={50}
                />
              )}
            />
          </div>

          <div className="flex justify-end gap-2  w-full">
            <Button
              type="button"
              variant={'transparent'}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button className="min-w-[120px]" variant={'primary'} type="submit" disabled={!isValid}>
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFolderModal;
