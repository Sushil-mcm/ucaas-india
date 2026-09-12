import { useGetGroupList } from '@/hooks/common';
import { DrowerProps } from '@/interfaces/common-interface';
import { handleAlert } from '@/lib/utils';
import { createLeadGroup, uploadContactInLead } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FC, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { CloseIcon, Download } from '@/assets/icons';
import countriesData from '@/assets/json/countries.json';
import { Button } from '@/components/ui/button';
import CustomSelect from '@/components/custom/custom-select';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import sampleCSVFIle from '@/assets/json/sampleCSVFIle.csv?raw';
import sampleLeadCSVFile from '@/assets/json/sampleLeadCSVFile.csv?raw';
import { UploadRowError, readUploadMessage, readUploadRowErrors } from '@/lib/upload-row-errors';
import { UploadIcon } from 'lucide-react';
import { LeadsTableRow } from '../lead-group-list';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface IUploadContactProps extends DrowerProps {
  selectedGroupId?: string;
  /** LEAD or CONTACT; defaults to what the page path says. */
  contactType?: 'LEAD' | 'CONTACT';
  /** Called once the upload is accepted, with the list it went into. */
  onUploaded?: (group: { value: string; label: string } | null) => void;
}

const ALLOWED_FILE_TYPES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const UploadContacts: FC<IUploadContactProps> = ({
  selectedGroupId,
  contactType,
  onUploaded,
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
  const queryClient: any = useQueryClient();
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: yupResolver(
      yup.object().shape({
        groupId: yup.mixed().nullable().optional(),
        file: yup.mixed().required('File is required'),
      }),
    ),
    mode: 'all',
  });

  const [newListName, setNewListName] = useState('');
  const [uploadedInto, setUploadedInto] = useState<{ value: string; label: string } | null>(null);
  /* What the server refused, row by row ("Unknown skill "Spanich" in row 4"),
     shown in the dialog beside the file so the list can be fixed and sent
     again. A toast cannot hold a list, and the request no longer toasts. */
  const [uploadErrors, setUploadErrors] = useState<UploadRowError[]>([]);
  const [uploadMessage, setUploadMessage] = useState('');
  const { mutate: mutateAddGroup, isPending } = useMutation({
    /* "New list" typed in the box: make the list first, then upload into it.
       One dialog, one step, no trip to the lists page. */
    mutationFn: async (payload: any) => {
      let belongsTo = payload.belongsTo;
      let into = payload.belongsTo ? { value: payload.belongsTo, label: payload.groupLabel || '' } : null;
      if (!belongsTo && newListName.trim()) {
        const created = await createLeadGroup({ groupName: newListName.trim() });
        const group = created?.data?.data?.result || created?.data?.data || {};
        belongsTo = group?._id || group?.id || group?.uuid;
        into = belongsTo ? { value: String(belongsTo), label: newListName.trim() } : null;
        if (!belongsTo) throw new Error('The list could not be created');
      }
      setUploadedInto(into);
      /* The label is for the screen only; the request takes the id. */
      const { groupLabel: _groupLabel, ...rest } = payload;
      return uploadContactInLead({ ...rest, belongsTo });
    },
    onSuccess: (data) => {
      if (data?.data?.success) {
        onUploaded?.(uploadedInto);
        setNewListName('');
        queryClient.invalidateQueries({ queryKey: ['getGroupList'] });
        queryClient.invalidateQueries({ queryKey: ['getGroupListQuery'] });
        queryClient.invalidateQueries({ queryKey: ['getGroupContactsById'] });
        /* Rows the server took the file but would not import stay on screen;
           the rest of the list is in, and the person can fix these and send
           them again. */
        const rowErrors = readUploadRowErrors(data);
        if (rowErrors.length) {
          setUploadErrors(rowErrors);
          setUploadMessage(
            `${rowErrors.length} ${rowErrors.length === 1 ? 'row was' : 'rows were'} not imported. The rest of the file is in.`,
          );
          return;
        }
        handleAlert({
          text: data?.data?.message || 'Upload started. Waiting for processing summary...',
          type: 'success',
        });
        reset();
        setDrawerState(false);
      }
    },
    onError: (error: any) => {
      const rowErrors = readUploadRowErrors(error);
      const message = readUploadMessage(error) || error?.message || 'The file could not be uploaded.';
      setUploadErrors(rowErrors);
      setUploadMessage(message);
      if (!rowErrors.length) handleAlert({ text: message, type: 'error' });
    },
  });

  const handleUploadModalClose = () => {
    setUploadErrors([]);
    setUploadMessage('');
    setDrawerState(false);
  };

  const onSubmit = (data: any) => {
    setUploadErrors([]);
    setUploadMessage('');
    const countryPrefix = data?.countryCode?.prefix?.split('-')?.[0] || '';
    if (!data?.groupId?.value && !newListName.trim() && !selectedGroupId) {
      handleAlert({ text: 'Choose a list, or type a name for a new one.', type: 'warning' });
      return;
    }
    const payload = {
      ...(data?.groupId?.value && { belongsTo: data.groupId.value, groupLabel: data?.groupId?.label }),
      type: contactType || (window.location.pathname.includes('leads') ? 'LEAD' : 'CONTACT'),
      file: data.file,
      ...(countryPrefix && {
        countryPrefix: countryPrefix?.startsWith('+') ? countryPrefix : `+${countryPrefix}`,
      }),
      ...(typeof data?.strictCountryCode === 'boolean' && {
        strictCountryCode: data?.strictCountryCode,
      }),
    };

    mutateAddGroup(payload);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && ALLOWED_FILE_TYPES.includes(file.type)) {
      setValue('file', file);
    } else {
      handleAlert({ text: 'Please upload a valid file (CSV, XLS, or XLSX)', type: 'error' });
    }
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

  /* Leads get the sample with the Skill column; contacts keep the plain one. */
  const handleDownload = () => {
    const blob = new Blob([isLead ? sampleLeadCSVFile : sampleCSVFIle], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = isLead ? 'sample-leads.csv' : 'sampleCSVFIle.csv';
    link.click();
  };
  const watchCountry = watch('countryCode');
  const countryPrefix = watchCountry?.prefix?.split('-')?.[0] || '';
  const normalizedPrefix = countryPrefix.startsWith('+') ? countryPrefix : `+${countryPrefix}`;
  return (
    <>
      <Dialog
        open={drawerState}
        onOpenChange={(val) => {
          if (!val) {
            handleUploadModalClose();
            return;
          }
          setDrawerState(true);
        }}
      >
        <DialogContent
          className="sm:w-1/2 lg:w-1/4 p-3 min-h-[26rem] max-h-[99%] overflow-y-auto"
          showCloseButton={false}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full flex flex-col gap-3 justify-between h-full"
          >
            <div className="flex flex-col gap-1.5  text-900/80 ">
              <div className="font-semibold truncate text-md flex items-center justify-between">
                Upload {isLead ? 'Lead' : 'Contact'}
                <div
                  onClick={() => {
                    handleUploadModalClose();
                    reset();
                  }}
                  className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
                >
                  <CloseIcon className="w-3 h-3" />
                </div>
              </div>
            </div>
            <div className="w-full flex flex-col gap-3">
              <div className="flex flex-col gap-2  text-900/80 ">
                {!selectedGroupId && (
                  <div className="w-full ">
                    <CustomSelect
                      options={filteredGroupList?.map((group: LeadsTableRow) => ({
                        label: group?.groupName || group?.slug || group?.name || '',
                        value: group?._id,
                      }))}
                      handleChange={(e: ISELECTVALUE | null) => {
                        setValue('groupId', e);
                      }}
                      label={'List'}
                      placeholder="Choose an existing list"
                      isClearable
                      value={watch('groupId')}
                      error={errors?.groupId?.message}
                    />
                    {!watch('groupId')?.value ? (
                      <div className="mt-2 flex flex-col gap-1">
                        <Label className="text-xs text-gray-600">or start a new list</Label>
                        <input
                          className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                          placeholder="New list name, e.g. October leads"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                        />
                      </div>
                    ) : null}
                    <p className="mt-2 text-xs text-gray-500">
                      Any CSV or Excel file with a phone column works. Names, email and consent columns are optional;
                      common headings such as "Mobile" or "Phone Number" are understood.
                    </p>
                    {isLead ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Columns: firstName, lastName, email, phone, skill. A Skill column names the skill or
                        language a lead needs, as it is spelt under Skills; that lead is then only offered to
                        people rated on it. Leave the cell empty for a lead anyone can take.
                      </p>
                    ) : null}
                  </div>
                )}
                <CustomSelect
                  label={'Country'}
                  isClearable
                  options={countriesData?.map((country: any) => ({
                    label: country?.name || '',
                    value: country?.isoCode || '',
                    prefix: country?.phonecode || '',
                  }))}
                  handleChange={(value) => {
                    setValue('countryCode', value, { shouldValidate: true });
                  }}
                  value={watch('countryCode')}
                  placeholder={'Select Country'}
                  error={errors?.country?.message}
                />
                {watchCountry?.value && (
                  <>
                    <div className="w-full p-2.5 rounded-md bg-yellow-50 border border-amber-400/20">
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Note:</span> add phone numbers with the
                        appropriate country prefix (e.g., {normalizedPrefix} XXXXXXXXXX).
                      </p>
                    </div>
                    <Controller
                      name="strictCountryCode"
                      control={control}
                      defaultValue={true}
                      render={({ field }) => (
                        <RadioGroup
                          value={field.value ? 'only' : 'all'}
                          onValueChange={(value) => field.onChange(value === 'only')}
                          className="flex gap-4 mt-2 mb-1"
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value="only" id="only-country" />
                            <Label htmlFor="only-country">Validate country code only</Label>
                          </div>

                          <div className="flex items-center gap-3">
                            <RadioGroupItem value="all" id="all-countries" />
                            <Label htmlFor="all-countries">
                              Auto-convert all numbers to selected country
                            </Label>
                          </div>
                        </RadioGroup>
                      )}
                    />
                  </>
                )}
              </div>
              <div className="flex gap-4 flex-row">
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-white hover:border-gray-400"
                >
                  <div className="flex flex-col items-center">
                    <UploadIcon className="w-5 h-5" />

                    <p className="pt-2 text-sm text-gray-900">Upload File</p>
                    <p className="mt-2 text-sm text-gray-700">Supported Format .csv, .xlsx, .xls</p>
                    {watch('file') && (
                      <p className="mt-2 text-sm text-primary">{watch('file')?.name}</p>
                    )}
                  </div>

                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={(e) => {
                      onFileChange(e);
                    }}
                  />
                </label>
              </div>
              {uploadMessage || uploadErrors.length ? (
                <div
                  className="w-full rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 flex flex-col gap-1"
                  role="alert"
                >
                  {uploadMessage ? <p className="font-medium">{uploadMessage}</p> : null}
                  {uploadErrors.length ? (
                    <ul className="list-disc pl-4 max-h-32 overflow-y-auto">
                      {uploadErrors.slice(0, 50).map((item, index) => (
                        <li key={`${item.row ?? 'x'}-${index}`}>
                          {item.row ? `Row ${item.row}: ` : ''}
                          {item.message}
                        </li>
                      ))}
                      {uploadErrors.length > 50 ? <li>and {uploadErrors.length - 50} more</li> : null}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              <a
                className="w-full text-right text-primary hover:text-primary/90 flex items-center justify-end"
                href="javascript:void(0);"
                onClick={handleDownload}
              >
                <small className="flex items-center">
                  <Download className="w-5 h-5" />
                  &nbsp;
                  <span className="underline underline-offset-2">Sample File</span>
                </small>
              </a>
            </div>
            <div className="justify-end flex gap-2">
              <Button type="button" variant={'transparent'} onClick={handleUploadModalClose}>
                Cancel
              </Button>
              <Button type="submit" variant={'primary'} disabled={!watch('file') || isPending}>
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UploadContacts;
