import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Controller, useForm } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { requiredDescription, requiredEmail, requiredString } from '@/lib/schema';
import ErrorTooltip from '@/components/custom/error-tooltip';
import PhoneInput from 'react-phone-input-2';
import { useMutation } from '@tanstack/react-query';
import { requestCustomizePlan } from '@/services/api';
import Loader from '@/components/custom/loader';
import { handleAlert } from '@/lib/utils';
import { useOrganization } from '@/hooks/use-organisation';
import { useState } from 'react';
import { VerifiedCheck } from '@/assets/icons';

const validationSchema = yup.object().shape({
  name: requiredString('Name'),
  email: requiredEmail(),
  message: requiredDescription('Message'),
});

type CustomizePlanProps = {
  open?: boolean;
  handleClose: () => void;
  variant?: 'modal' | 'page';
};

const CustomizePlanModal = ({
  open = false,
  handleClose,
  variant = 'modal',
}: CustomizePlanProps) => {
  const { mainSiteInfo } = useOrganization();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    defaultValues: {
      name: '',
      email: '',
      contact: '',
      message: '',
    },
    resolver: yupResolver(validationSchema),
    mode: 'onChange',
  });
  const { mutate: mutateRequestPlan, isPending } = useMutation({
    mutationKey: ['requestCustomizePlan'],
    mutationFn: requestCustomizePlan,
    onSuccess: ({ data }: any) => {
      const message = data?.data?.message || 'Plan request submitted successfully';

      if (variant === 'page') {
        setSuccessMessage(message);
        setIsSubmitted(true);
        return;
      }

      handleAlert({ text: message, type: 'success' });
      handleClose();
    },
  });
  const onSubmit = (values: any) => {
    const { contact, ...rest } = values || {};
    const payload = {
      ...rest,
      ...(contact != null && contact !== '' ? { contact } : {}),
      website_uuid: mainSiteInfo?.uuid,
    };

    mutateRequestPlan(payload);
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            value={field?.value}
            label="Full Name"
            error={errors?.name?.message}
            placeholder={'Enter full name'}
          />
        )}
      />

      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            label="Email"
            placeholder="Enter email"
            type="email"
            error={errors?.email?.message}
          />
        )}
      />
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Contact</Label>
          <div className="flex items-start ">
            {errors?.contact?.message && <ErrorTooltip text={errors?.contact?.message} />}
          </div>
        </div>
        <Controller
          name="contact"
          control={control}
          render={({ field }) => <PhoneInput {...field} country={'us'} />}
        />
      </div>
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center justify-between">
          <Label className="text-sm leading-none font-medium">Message</Label>
          <div className="flex items-start ">
            {errors?.message?.message && <ErrorTooltip text={errors?.message?.message} />}
          </div>
        </div>
        <Controller
          name="message"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              className={`w-full h-full leading-7 p-2 rounded-xl text-sm overflow-y-auto placeholder:text-gray-700
    focus:ring-0 focus-visible:shadow-none focus-visible:outline-0 text-gray-900 shadow-none resize-none
    border border-gray-200 ${
      errors?.message?.message ? 'border-red-500 focus:border-red-500' : ''
    }`}
              rows={4}
              placeholder="Write message here..."
            />
          )}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="transparent" onClick={handleClose}>
          Cancel
        </Button>
        <Button type="submit" variant={'outline'} disabled={isPending}>
          {isPending && <Loader variant="blue" />} Send Message
        </Button>
      </div>
    </form>
  );

  if (variant === 'page') {
    return (
      <section className="w-full max-w-xl rounded-xl bg-white p-6 shadow-md sm:p-8">
        {isSubmitted ? (
          <div
            role="status"
            className="flex min-h-96 flex-col items-center justify-center gap-4 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <VerifiedCheck className="h-8 w-8 text-green-700" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Thank you!</h1>
            <p className="max-w-md text-base text-gray-600">{successMessage}</p>
            <p className="max-w-md text-sm text-gray-500">
              Our team will review your requirements and contact you with a tailored plan.
            </p>
            <Button type="button" variant="outline" className="mt-2" onClick={handleClose}>
              Back to Home
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-2">
              <h1 className="text-xl font-semibold text-gray-900">Customize Your Plan</h1>
              <p className="text-sm text-gray-500">
                Share your requirements, expected usage, and any specific features you need. Our
                team will contact you with a tailored plan that fits your business.
              </p>
            </div>
            {form}
          </>
        )}
      </section>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Customize Your Plan</DialogTitle>
          <DialogDescription>
            Share your requirements, expected usage, and any specific features you need. Our team
            will contact you with a tailored plan that fits your business.
          </DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
};

export default CustomizePlanModal;
