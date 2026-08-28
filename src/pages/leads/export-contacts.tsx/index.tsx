import { useGetGroupList } from '@/hooks/common';
import { handleAlert } from '@/lib/utils';
import { exportContact } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation } from '@tanstack/react-query';
import { FC, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { CloseIcon } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import CustomSelect from '@/components/custom/custom-select';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { LeadsTableRow } from '../lead-group-list';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface IExportContactsProps {
  drawerState: boolean;
  setDrawerState: (val: boolean) => void;
  selectedGroupId?: string;
}

const ExportContacts: FC<IExportContactsProps> = ({
  selectedGroupId,
  setDrawerState,
  drawerState,
}) => {
  const isLead = window.location.pathname.includes('leads');
  const { data: groupList = [], refetch: refetchGroupList } = useGetGroupList({
    type: !isLead ? 'CONTACT' : 'LEAD',
    generatedBy: !isLead ? 'COMPANY' : null,
    displayType: 'dropdown',
  });
  const filteredGroupList = groupList;

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: yupResolver(
      yup.object().shape({
        groupId: yup.object().required('Group is required').nullable(),
        format: yup.object().required('Format is required').nullable(),
      }),
    ),
    defaultValues: {
      groupId: null,
      format: { label: 'CSV', value: 'csv' },
    },
    mode: 'all',
  });

  const { mutate: mutateExport, isPending } = useMutation({
    mutationFn: exportContact,
    onSuccess: (data) => {
      const result = data?.data?.data || data?.data || {};
      const downloadUrl = result?.url || result?.fileUrl || result?.downloadUrl;
      const headerFileName = data?.headers?.['x-file-name'] || data?.headers?.['X-File-Name'];
      const fileName =
        headerFileName ||
        `exported_${isLead ? 'leads' : 'contacts'}_${Date.now()}.${watch('format')?.value || 'csv'}`;

      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        handleAlert({ text: 'Exported successfully!', type: 'success' });
        setDrawerState(false);
      } else {
        handleAlert({ text: 'Exported successfully!', type: 'success' });
        const isCsv = watch('format')?.value === 'csv';
        const fileContent = isCsv
          ? typeof data?.data === 'string'
            ? data.data
            : JSON.stringify(data?.data)
          : data?.data;
        const blob = new Blob([fileContent], {
          type: isCsv
            ? 'text/csv'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setDrawerState(false);
        reset();
      }
    },
    onError: (err: any) => {
      let errMsg = 'Failed to export data';
      if (err?.response?.data instanceof ArrayBuffer) {
        try {
          const decoded = JSON.parse(new TextDecoder().decode(err.response.data));
          errMsg = decoded?.error?.message || decoded?.message || errMsg;
        } catch (e: any) {
          console.log(e);

          // ignore parsing error
        }
      } else {
        errMsg = err?.response?.data?.error?.message || err?.response?.data?.message || errMsg;
      }
      handleAlert({ text: errMsg, type: 'error' });
      reset();
    },
  });

  const handleExportModalClose = () => {
    setDrawerState(false);
  };

  const onSubmit = (data: any) => {
    const payload = {
      groupId: data.groupId.value,
      format: data.format.value,
      type: (isLead ? 'LEAD' : 'CONTACT') as 'LEAD' | 'CONTACT',
    };

    mutateExport(payload);
  };

  useEffect(() => {
    if (selectedGroupId) {
      setValue('groupId', {
        label: filteredGroupList?.find((group: LeadsTableRow) => group?._id === selectedGroupId)
          ?.name,
        value: selectedGroupId,
      });
    }
  }, [selectedGroupId, filteredGroupList]);

  useEffect(() => {
    if (drawerState) {
      refetchGroupList();
    }
  }, [drawerState, refetchGroupList]);

  return (
    <>
      <Dialog
        open={drawerState}
        onOpenChange={(val) => {
          if (!val) {
            handleExportModalClose();
            return;
          }
          setDrawerState(true);
        }}
      >
        <DialogContent
          className="sm:w-1/2 lg:w-1/4 p-4 min-h-[16rem] max-h-[99%] overflow-y-auto"
          showCloseButton={false}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full flex flex-col gap-4 justify-between h-full"
          >
            <div className="flex flex-col gap-1.5 text-900/80">
              <div className="font-semibold truncate text-md flex items-center justify-between">
                Export {isLead ? 'Leads' : 'Contacts'}
                <div
                  onClick={() => {
                    handleExportModalClose();
                    reset();
                  }}
                  className="cursor-pointer text-gray-500 hover:text-gray-900 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <CloseIcon className="w-3 h-3" />
                </div>
              </div>
            </div>
            <div className="w-full flex flex-col gap-4">
              <div className="flex flex-col gap-3 text-900/80">
                <div className="w-full">
                  <CustomSelect
                    options={filteredGroupList?.map((group: LeadsTableRow) => ({
                      label: group?.groupName || group?.slug || group?.name || '',
                      value: group?._id,
                    }))}
                    handleChange={(e: ISELECTVALUE | null) => {
                      setValue('groupId', e, { shouldValidate: true });
                    }}
                    label={'Select Group'}
                    value={watch('groupId')}
                    error={errors?.groupId?.message as string}
                    placeholder="Select Group"
                  />
                </div>
                <div className="w-full">
                  <CustomSelect
                    options={[
                      { label: 'CSV', value: 'csv' },
                      { label: 'Excel (XLSX)', value: 'xlsx' },
                    ]}
                    handleChange={(e: ISELECTVALUE | null) => {
                      setValue('format', e, { shouldValidate: true });
                    }}
                    label={'Select Format'}
                    value={watch('format')}
                    error={errors?.format?.message as string}
                    placeholder="Select Format"
                  />
                </div>
              </div>
            </div>
            <div className="justify-end flex gap-2 pt-2">
              <Button type="button" variant={'transparent'} onClick={handleExportModalClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={'primary'}
                disabled={isPending || !watch('groupId')?.value || !watch('format')?.value}
              >
                {isPending ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExportContacts;
