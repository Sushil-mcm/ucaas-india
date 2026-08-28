import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CloseIcon } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addAIDomain, getChatAgentList } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import Loader from '@/components/custom/loader';
import { handleAlert } from '@/lib/utils';
import CustomSelect from '@/components/custom/custom-select';
import { addDomainInitialValues, addDomainSchema } from '../../../constants';

interface AddGroupLeadModalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  group?: any;
  selectedCreateType?: string;
  selectedLeads?: string[];
}

function AddDomainModal({ modalState, setModalState }: AddGroupLeadModalProps) {
  const queryClient: any = useQueryClient();

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<any>({
    defaultValues: addDomainInitialValues,
    resolver: yupResolver(addDomainSchema),
    mode: 'onSubmit',
  });
  const { data: typeListData = [] } = useQuery({
    queryKey: ['getChatAgentList'],
    queryFn: () => getChatAgentList(),
    select: (data) => data?.data?.data?.result?.rows || [],
  });
  const { mutate, isPending } = useMutation({
    mutationFn: addAIDomain,
    mutationKey: ['addAIDomain'],
    onSuccess: (data) => {
      queryClient.invalidateQueries(['getAIDomainList']);
      setModalState(false);
      handleAlert({
        text: data?.data?.data?.message || 'Domain added successfully.',
        type: 'success',
      });
    },
  });

  const chatAgents =
    (typeListData || [])
      ?.filter((agent: any) => agent?.agentType !== 'data')
      ?.map((agent: any) => ({
        label: agent?.agentName,
        value: agent?.agent_uuid,
      })) || [];

  const onSubmit = async (values: any) => {
    mutate({
      domain: values?.domain || '',
      agentId: values?.agentId?.value,
    });
  };

  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="w-1/3 p-3  max-h-[99%] overflow-y-auto" showCloseButton={false}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full flex flex-col gap-3 justify-between h-full"
        >
          <div className="flex flex-col gap-1.5  text-900/80 ">
            <div className="font-semibold truncate text-md flex items-center justify-between">
              Add Domain
              <div
                onClick={() => setModalState(false)}
                className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
              >
                <CloseIcon className="w-3 h-3" />
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col gap-3">
            <Controller
              control={control}
              name={'agentId'}
              render={({ field }) => (
                <CustomSelect
                  {...field}
                  label={'Agent'}
                  placeholder="Select agent"
                  handleChange={(value) => field.onChange(value)}
                  options={chatAgents || []}
                  error={(errors.agentId as any)?.value?.message}
                />
              )}
            />
            <Controller
              control={control}
              name={'domain'}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter domain"
                  label="Domain"
                  error={errors?.domain?.message}
                />
              )}
            />
          </div>
          <div className="justify-end flex gap-2">
            <Button variant={'transparent'} type="button" onClick={() => setModalState(false)}>
              Cancel
            </Button>
            <Button disabled={isPending} variant={'primary'} type="submit">
              {isPending && <Loader variant="blue" />}Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddDomainModal;
