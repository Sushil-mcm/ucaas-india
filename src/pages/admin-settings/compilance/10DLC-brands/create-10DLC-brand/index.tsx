import { useMemo, useState } from 'react';
import {
  BRAND_INITIALS,
  brandDetailsSchema,
  brandRelationshipSchema,
  contactDetailsSchema,
  DLC_BRAND_TABS_CONST,
} from '../constant';
import BrandDetails from './brand-details';
import BrandRelationship from './brand-relationship';
import ContactDetails from './contact-details';
import { useForm } from 'react-hook-form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { brandCreate } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { AnyObjectSchema } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

const schemaLookUp = {
  [DLC_BRAND_TABS_CONST.BRAND_DETAILS]: brandDetailsSchema,
  [DLC_BRAND_TABS_CONST.BRAND_RELATIONSHIP]: brandRelationshipSchema,
  [DLC_BRAND_TABS_CONST.CONTACT_DETAILS]: contactDetailsSchema,
};
const Create10DLCBrand = ({ setDrawerState }: any) => {
  const queryClient: any = useQueryClient();

  const steps = [
    DLC_BRAND_TABS_CONST.BRAND_DETAILS,
    DLC_BRAND_TABS_CONST.BRAND_RELATIONSHIP,
    DLC_BRAND_TABS_CONST.CONTACT_DETAILS,
  ];

  const [currentStep, setCurrentStep] = useState(steps[0]);

  const activeSchema = useMemo(() => {
    return schemaLookUp[currentStep] as AnyObjectSchema;
  }, [currentStep]);

  const formMethods = useForm({
    defaultValues: BRAND_INITIALS,
    resolver: yupResolver(activeSchema),
    mode: 'onChange',
  });
  console.log({ object: formMethods.watch(), errors: formMethods.formState.errors });

  const { mutate, isPending } = useMutation({
    mutationFn: brandCreate,
    onSuccess: ({ data }) => {
      console.log('🚀 ~ Create10DLCBrand ~ data:', data);
      queryClient.invalidateQueries(['getUsersDetails'], {
        exact: true,
      });
      handleAlert({
        text: data?.data?.message,
        type: 'success',
      });
      setDrawerState(false);
    },
  });

  const currentIndex = steps.indexOf(currentStep);

  const goNext = async () => {
    const valid = await formMethods.trigger();
    if (!valid) return;

    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const onSubmit = (data: any) => {
    const {
      entityType,
      country,
      einIssuingCountry,
      altBusinessIdType,
      stockExchange,
      vertical,
      state,
      ...rest
    } = data || {};
    const payload = {
      ...rest,
      entityType: entityType?.value,
      country: country?.value,
      einIssuingCountry: einIssuingCountry?.value,
      altBusinessIdType: altBusinessIdType?.value,
      stockExchange: stockExchange?.value,
      state: state?.value,
      vertical: vertical?.value,
    };
    mutate(payload);
  };

  const stepLookUp = {
    [DLC_BRAND_TABS_CONST.BRAND_DETAILS]: <BrandDetails formMethods={formMethods} />,
    [DLC_BRAND_TABS_CONST.BRAND_RELATIONSHIP]: <BrandRelationship formMethods={formMethods} />,
    [DLC_BRAND_TABS_CONST.CONTACT_DETAILS]: <ContactDetails formMethods={formMethods} />,
  };

  return (
    <div className="w-full flex flex-col gap-4 justify-between h-full ten-dlc-brand-drawer">
      <Tabs
        value={currentStep}
        onValueChange={async (step) => {
          if (step === currentStep) return;

          const valid = await formMethods.trigger();

          if (!valid) return;

          setCurrentStep(step);
        }}
        className="flex w-full ten-dlc-brand-tabs"
      >
        <div className="border-b border-gray-200 w-full ten-dlc-brand-tabs-header">
          <TabsList className="flex text-sm font-semibold p-0 rounded-none bg-transparent min-h-10 ten-dlc-brand-tabs-list">
            {steps.map((step) => (
              <TabsTrigger
                key={step}
                value={step}
                className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4   m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs ten-dlc-brand-tab-trigger"
              >
                {step}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <form
        onSubmit={formMethods.handleSubmit(onSubmit)}
        className="h-full flex flex-col justify-between ten-dlc-brand-form"
      >
        <div className="ten-dlc-brand-step-content">{stepLookUp[currentStep]}</div>

        <div className="flex justify-end gap-2 mt-4 ten-dlc-brand-footer">
          <Button
            variant="transparent"
            type="button"
            onClick={() => setDrawerState(false)}
            className="ten-dlc-brand-footer-btn"
          >
            Cancel
          </Button>

          <Button
            variant="outline"
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="ten-dlc-brand-footer-btn"
          >
            Prev
          </Button>

          {currentIndex === steps.length - 1 ? (
            <Button
              type="submit"
              variant="default"
              disabled={isPending}
              className="ten-dlc-brand-footer-btn"
            >
              Submit
            </Button>
          ) : (
            <Button
              variant="outline"
              type="button"
              onClick={goNext}
              className="ten-dlc-brand-footer-btn"
            >
              Next
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default Create10DLCBrand;
