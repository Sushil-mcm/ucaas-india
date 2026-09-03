import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import countriesData from '@/assets/json/countries.json';
import { FC, useEffect, useState } from 'react';
import CustomSelect from '@/components/custom/custom-select';
import { Input } from '@/components/ui/input';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CloseIcon } from '@/assets/icons';

/* This deployment is India-only — every regional setting is India's, so the
   field is fixed rather than offered as a choice. */
const INDIA_ISO_CODE = 'IN';

interface RegionalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  data: any;
  initialRegionalSettings: any;
  onSuccess?: () => void;
}
const RegionalModal: FC<RegionalProps> = ({
  modalState,
  setModalState,
  data,
  initialRegionalSettings,
  onSuccess,
}) => {
  const [timezonesList, setTimezonesList] = useState<any>([]);

  const {
    getValues,
    setValue,
    trigger,
    clearErrors,
    formState: { errors },
  } = useFormContext();
  const [draftRegional, setDraftRegional] = useState<any>(null);
  const [localErrors, setLocalErrors] = useState<{ country?: string; timezone?: string }>({});

  const getCountryCodeLabel = (country: any) =>
    `${country.name} (${country.phonecode?.startsWith('+') ? country.phonecode : `+${country.phonecode}`})`;

  const getCountryByIsoCode = (countryCode?: string) => {
    if (!countryCode) return null;
    const normalizedCode = countryCode.toUpperCase();
    return countriesData.find((item) => item?.isoCode?.toUpperCase() === normalizedCode) || null;
  };

  const buildDraftRegional = (regionalSettings: any) => {
    const sourceTimezoneValue = regionalSettings?.timezone?.value;

    const resolvedCountry = getCountryByIsoCode(INDIA_ISO_CODE);

    if (!resolvedCountry) {
      return {
        country: { label: '', value: '', name: '' },
        country_code: { label: '', value: '', name: '' },
        timezone: { label: 'Select', value: '' },
        timezones: [],
      };
    }

    const isTimezoneValidForCountry = resolvedCountry?.timezones?.some(
      (timezone: { zoneName: string }) => timezone?.zoneName === sourceTimezoneValue,
    );
    const defaultTimezone = isTimezoneValidForCountry
      ? sourceTimezoneValue
      : resolvedCountry?.timezones?.[0]?.zoneName || '';

    return {
      country: {
        label: resolvedCountry.name,
        value: resolvedCountry.name,
        name: resolvedCountry.name || '',
      },
      country_code: {
        label: getCountryCodeLabel(resolvedCountry),
        value: resolvedCountry.isoCode,
        name: resolvedCountry.name || '',
      },
      timezone: {
        label: defaultTimezone || 'Select',
        value: defaultTimezone || '',
      },
      timezones: resolvedCountry?.timezones || [],
    };
  };

  useEffect(() => {
    if (!modalState) return;

    const currentRegionalSettings =
      getValues('settings.operational_hours.regional') || initialRegionalSettings || {};
    const draft = buildDraftRegional(currentRegionalSettings);
    setDraftRegional(draft);
    setTimezonesList(draft?.timezones || []);
    setLocalErrors({});
  }, [modalState, initialRegionalSettings]);

  const handleSubmit = async () => {
    const nextErrors: { country?: string; timezone?: string } = {};
    if (!draftRegional?.country?.value) {
      nextErrors.country = 'Country is required';
    }
    if (!draftRegional?.timezone?.value) {
      nextErrors.timezone = 'Timezone is required';
    }
    setLocalErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setValue('settings.operational_hours.regional.country_code', draftRegional?.country_code, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('settings.operational_hours.regional.country', draftRegional?.country, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('settings.operational_hours.regional.timezone', draftRegional?.timezone, {
      shouldValidate: true,
      shouldDirty: true,
    });
    clearErrors('settings.operational_hours.regional');

    const isValid = await trigger([
      'settings.operational_hours.regional.country_code',
      'settings.operational_hours.regional.timezone',
      'settings.operational_hours.regional.country',
    ]);
    if (!isValid) return;
    onSuccess?.();
    setModalState(false);
  };
  const handleCancel = () => {
    setLocalErrors({});
    setModalState(false);
  };

  return (
    <Dialog
      open={modalState}
      onOpenChange={(val) => {
        if (!val) {
          handleCancel();
        }
        setModalState(val);
      }}
    >
      <DialogContent
        className="sm:w-1/2 md:w-1/4 p-3 max-h-[99%] overflow-y-auto"
        showCloseButton={false}
      >
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">Regional Settings</DialogTitle>
            <div
              onClick={handleCancel}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5 w-full">
            <Input label="Country" value="India" disabled />
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <Label>Country Code</Label>
            <div className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border rounded-xl border-grey-400">
              {draftRegional?.country_code?.label}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <CustomSelect
              label={'Timezone'}
              placeholder="Select Timezone"
              options={timezonesList.map((timezone: { zoneName: string }) => ({
                label: timezone?.zoneName,
                value: timezone?.zoneName,
              }))}
              handleChange={(e: ISELECTVALUE | null) => {
                setDraftRegional((prev: any) => ({ ...prev, timezone: e || {} }));
                setLocalErrors((prev) => ({ ...prev, timezone: undefined }));
              }}
              value={draftRegional?.timezone}
              error={
                localErrors?.timezone ||
                (errors.settings as any)?.operational_hours?.regional?.timezone?.value?.message
              }
            />
          </div>
          {/* <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-1.5 w-full">
              <Label>Time Format</Label>
              <RadioGroup
                className="w-full flex gap-4 min-h-10"
                value={watch('settings.operational_hours.regional.time_format')?.toString()}
                onValueChange={(value) =>
                  setValue('settings.operational_hours.regional.time_format', value)
                }
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="12" id="yes" className="cursor-pointer" />
                  <Label htmlFor="yes">12 H(AM/PM)</Label>
                </div>

                <div className="flex items-center gap-3">
                  <RadioGroupItem value="24" id="no" className="cursor-pointer" />
                  <Label htmlFor="no">24 Hours</Label>
                </div>
              </RadioGroup>
            </div>
          </div> */}
        </div>
        <DialogFooter>
          <div className="justify-end flex gap-2">
            <Button variant={'transparent'} type="button" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant={'outline'} type="button" onClick={() => handleSubmit()}>
              Submit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegionalModal;
