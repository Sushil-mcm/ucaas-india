import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CloseIcon } from '@/assets/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  addGlobalKnowledgeBase,
  AIUserKnowledgeBase,
  getAgentList,
  getAIAgentToken,
} from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import Loader from '@/components/custom/loader';
import { handleAlert } from '@/lib/utils';
import CustomSelect from '@/components/custom/custom-select';
import { addGlobalIngestionInitial, addGlobalIngestionSchema } from '../../../constants';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { iconObj } from '../../know-base-list';

interface AddGroupLeadModalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  onSuccess?: () => void;
}

function AttachGlobalKnowledgeBase({
  modalState,
  setModalState,
  onSuccess = () => {},
}: AddGroupLeadModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<any>({
    defaultValues: addGlobalIngestionInitial,
    resolver: yupResolver(addGlobalIngestionSchema),
    mode: 'all',
  });
  const { data: typeListData = [] } = useQuery({
    queryKey: ['getAgentList'],
    queryFn: () => getAgentList(),
    select: (data) => data?.data?.data?.result?.rows || [],
  });
  const { data: knowledgeBaseList = [], isLoading } = useQuery({
    queryKey: ['AIUserKnowledgeBase'],
    queryFn: () => AIUserKnowledgeBase(),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const { mutate, isPending } = useMutation({
    mutationFn: addGlobalKnowledgeBase,
    mutationKey: ['addGlobalKnowledgeBase'],
    onSuccess: (data) => {
      setModalState(false);
      handleAlert({
        text: data?.data?.data?.message || 'Knowledge attached successfully.',
        type: 'success',
      });
      onSuccess();
    },
  });

  const { mutateAsync: mutateGetToken, isPending: isPendingGetToken } = useMutation({
    mutationFn: getAIAgentToken,
    mutationKey: ['getAIAgentToken'],
  });

  const chatAgents =
    (typeListData || [])?.map((agent: any) => ({
      label: agent?.agentName,
      value: agent?._id,
    })) || [];

  const onSubmit = async (values: any) => {
    const response = await mutateGetToken();
    const tokenId = response?.data?.data?.result?.tokenId;
    const agentIds = values?.agentId?.map((item: { value: string }) => item?.value) || [];

    if (tokenId) {
      const payload = {
        token: tokenId,
        ingestionIds: selectedIds,
        agentIds: agentIds,
      };
      mutate(payload);
    }
  };

  const filteredKnowledge =
    knowledgeBaseList?.filter((item: { scope: string }) => item?.scope === 'global') || [];
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="w-4/6 xxl:w-3/7 p-3  " showCloseButton={false}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full flex flex-col gap-3 justify-between h-full "
        >
          <div className="flex flex-col gap-1.5  text-900/80 ">
            <div className="font-semibold truncate text-md flex items-center justify-between">
              Attach Global Knowledge Base
              <div
                onClick={() => setModalState(false)}
                className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
              >
                <CloseIcon className="w-3 h-3" />
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col gap-3 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
            <Controller
              control={control}
              name={'agentId'}
              render={({ field }) => (
                <CustomSelect
                  {...field}
                  isMulti
                  label={'Agent *'}
                  placeholder="Select agent"
                  handleChange={(value) => field.onChange(value)}
                  options={chatAgents || []}
                  error={errors.agentId?.message as string}
                  inputClass="team_chat"
                />
              )}
            />
            <div className="flex flex-col gap-3">
              {isLoading ? (
                <div className="flex justify-center">
                  <Loader variant="blue" />
                </div>
              ) : filteredKnowledge && filteredKnowledge?.length > 0 ? (
                filteredKnowledge?.map((item: any) => {
                  const checked = selectedIds?.includes(item?.ingestionId);
                  const type = item?.type;
                  return (
                    <div
                      key={item?.ingestionId}
                      onClick={() => toggleSelection(item?.ingestionId)}
                      className={`border rounded-lg p-3 cursor-pointer flex items-center gap-3 transition 
                       ${checked ? 'border-primary bg-ucass-active-bg' : 'border-gray-300'}
                      `}
                    >
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSelection(item?.ingestionId)}
                        />
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <div>{iconObj[type as keyof typeof iconObj]}</div>
                          <span className="font-semibold">{item?.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate block w-[70%] xl:w-[95%] max-w-[450px]">
                          {item?.text || item?.url || item?.file}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-md">
                  No items available
                </div>
              )}
            </div>
          </div>
          <div className="justify-end flex gap-2">
            <Button variant={'transparent'} type="button" onClick={() => setModalState(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                isPendingGetToken ||
                isPending ||
                filteredKnowledge?.length == 0 ||
                selectedIds?.length == 0
              }
              variant={'primary'}
              type="submit"
            >
              {(isPendingGetToken || isPending) && <Loader variant="blue" />}Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AttachGlobalKnowledgeBase;
