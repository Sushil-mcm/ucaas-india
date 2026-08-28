import { handleAlert } from '@/lib/utils';
import { uploadDncCampaign } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FC } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { CloseIcon, Download } from '@/assets/icons';
import countriesData from '@/assets/json/countries.json';
import { Button } from '@/components/ui/button';
import CustomSelect from '@/components/custom/custom-select';

import sampleCSVFIle from '@/assets/json/sampleCSVFIle.csv?raw';
import { UploadIcon } from 'lucide-react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const ALLOWED_FILE_TYPES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const UploadDnc: FC<{ drawerState: boolean; setDrawerState: (state: boolean) => void }> = ({
  setDrawerState,
  drawerState,
}) => {
  const queryClient: any = useQueryClient();
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: yupResolver(
      yup.object().shape({
        file: yup.mixed().required('File is required'),
        countryCode: yup.object().required('Country is required'),
      }),
    ),
    mode: 'all',
  });

  const { mutate: mutateAddGroup, isPending } = useMutation({
    mutationFn: uploadDncCampaign,
    onSuccess: (data) => {
      if (data?.data?.success) {
        handleAlert({
          text: data?.data?.message || 'DNC Campaign saved successfully!',
          type: 'success',
        });
        queryClient.invalidateQueries(['getPersonalDncList']);
        setValue('file', '');
        setValue('countryCode', '');
        setDrawerState(false);
      }
    },
  });

  const onSubmit = (data: any) => {
    const countryPrefix = data?.countryCode?.prefix?.split('-')?.[0] || '';
    const payload = {
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

  const handleDownload = () => {
    const blob = new Blob([sampleCSVFIle], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sampleDNC.csv';
    link.click();
  };
  const watchCountry = watch('countryCode');
  const countryPrefix = watchCountry?.prefix?.split('-')?.[0] || '';
  const normalizedPrefix = countryPrefix.startsWith('+') ? countryPrefix : `+${countryPrefix}`;
  return (
    <>
      <Dialog open={drawerState} onOpenChange={(val) => setDrawerState(val)}>
        <DialogContent className="w-1/4 p-3  max-h-[99%] overflow-y-auto" showCloseButton={false}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full flex flex-col gap-3 justify-between h-full"
          >
            <div className="flex flex-col gap-1.5  text-900/80 ">
              <div className="font-semibold truncate text-md flex items-center justify-between">
                Upload DNC
                <div
                  onClick={() => setDrawerState(false)}
                  className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
                >
                  <CloseIcon className="w-3 h-3" />
                </div>
              </div>
            </div>
            <div className="w-full flex flex-col gap-3">
              <div className="flex flex-col gap-2  text-900/80 ">
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
                  error={errors?.countryCode?.message}
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
              <Button type="button" variant={'transparent'} onClick={() => setDrawerState(false)}>
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

export default UploadDnc;
