import { CloseIcon } from '@/assets/icons';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { getRoleList } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';

interface RoleModalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  data: any;
}
const RoleModal: FC<RoleModalProps> = ({ modalState, setModalState, data }) => {
  const { settings = {} } = data || {};
  const { data: roleList = [] } = useQuery({
    queryKey: ['useRolesList'],
    queryFn: () => getRoleList(),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const {
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext();

  const handleSubmit = async () => {
    const isValid = await trigger(['settings.role']);
    if (!isValid) return;
    setModalState(false);
  };
  const handleCancel = () => {
    setValue('settings.role', settings?.role || { label: '', value: '' });
    setValue('settings.group', settings?.group || { label: '', value: '' });
    setModalState(false);
  };
  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent
        className="lg:w-1/4 sm:w-2/4 w-full p-3 max-h-[99%]  overflow-y-auto"
        showCloseButton={false}
      >
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Select Role
            <div
              onClick={handleCancel}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <CustomSelect
          options={roleList?.map(
            (role: { name: string; role_uuid: string; type: string; uuid: string }) => ({
              label: role?.name,
              value: role?.type === 'custom' ? role?.uuid : role?.role_uuid,
            }),
          )}
          handleChange={(e: ISELECTVALUE | null) => {
            setValue('settings.role', e, { shouldValidate: true });
          }}
          value={watch('settings.role')}
          error={(errors.role as any)?.value?.message}
        />
        <DialogFooter>
          <div className="flex justify-end gap-2">
            <Button type="button" variant={'transparent'} onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" variant={'outline'} onClick={() => handleSubmit()}>
              Submit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoleModal;
