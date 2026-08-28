import { useEffect, useState } from 'react';
import OtpInput from 'react-otp-input';
import { useMutation } from '@tanstack/react-query';
import { sendOtp, sendOtpForSignUP } from '@/services/api';
import { getDeviceId, handleAlert } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Loader from '@/components/custom/loader';
import { CloseIcon } from '@/assets/icons';
import { Label } from '@/components/ui/label';

const OtpVerification = ({
  formData,
  setOtp,
  otp,
  onConfirm,
  apiLoading,
  handleClose,
  remainingAttempts = null,
  isSignUp = false,
}: {
  formData: any;
  setOtp: any;
  otp: any;
  onConfirm: any;
  apiLoading: boolean;
  handleClose: any;
  remainingAttempts?: number | null;
  isSignUp?: boolean;
}) => {
  const [timer, setTimer] = useState(120);

  useEffect(() => {
    if (timer > 0) {
      const countdown = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(countdown);
    }
  }, [timer]);

  const { mutate: mutateSendOtp } = useMutation({
    mutationFn: isSignUp ? sendOtpForSignUP : sendOtp,
    onSuccess: () => {
      setTimer(60);
      handleAlert({ text: 'OTP sent successfully', type: 'success' });
    },
  });

  // Auto-verify when 6 digits are entered
  useEffect(() => {
    if (otp?.length === 6) {
      onConfirm();
    }
  }, [otp]);

  const handleResend = async () => {
    if (isSignUp) {
      const websiteUuid = localStorage.getItem('org_uuid') || '';
      mutateSendOtp({
        email: formData?.email,
        device_id: getDeviceId(),
        website_uuid: websiteUuid,
        name: `${formData?.first_name || ''} ${formData?.last_name || ''}`.trim(),
      });
    } else {
      mutateSendOtp({ email: formData?.email, device_id: getDeviceId() });
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1.5 text-900/80">
        <div className="font-semibold truncate text-md flex items-center justify-between">
          OTP Verification
          <div
            onClick={() => handleClose()}
            className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
          >
            <CloseIcon className="w-3 h-3" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-6 items-center">
        <p className="text-grey-900 font-semibold text-center">
          One Time Password (OTP) has been sent to
          <br />
          <span className="font-semibold text-primary">{formData?.email}</span>
        </p>
        {remainingAttempts !== null && (
          <p className="text-sm text-amber-600 font-medium">
            {remainingAttempts > 0
              ? `${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining`
              : 'No attempts remaining. Please request a new OTP.'}
          </p>
        )}
        <div className="flex flex-col gap-2 items-center">
          <Label>Enter the OTP below to verify it.</Label>
          <OtpInput
            value={otp}
            onChange={setOtp}
            numInputs={6}
            inputType="tel"
            shouldAutoFocus={true}
            containerStyle="flex gap-2"
            inputStyle={{
              borderRadius: '0.625rem',
              borderWidth: '1px',
              borderColor: '#ebe6e7',
              backgroundColor: '#ffffff',
              lineHeight: '1.5rem',
              width: '40px',
              height: '40px',
              fontSize: '.875rem',
              color: '#101828',
              fontWeight: '400',
              boxShadow: 'none',
              outline: 'none',
            }}
            renderInput={(props) => <input disabled={apiLoading} autoFocus {...props} />}
          />
        </div>
        {timer <= 0 ? (
          <div className=" text-grey-800 text-sm flex gap-2">
            You can now resend the OTP. <br />
            <button
              onClick={handleResend}
              className="underline text-primary font-medium cursor-pointer"
            >
              {'Resend OTP'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-800">
            Resend OTP in{' '}
            <span className="font-semibold">
              {String(Math.floor(timer / 60)).padStart(2, '0')}:
              {String(timer % 60).padStart(2, '0')}
            </span>
          </p>
        )}

        <div className="flex justify-end w-full">
          <Button
            variant={'primary'}
            type="submit"
            onClick={onConfirm}
            disabled={apiLoading || otp.length !== 6}
          >
            {apiLoading ? <Loader variant="blue" /> : 'Verify'}
          </Button>
        </div>
      </div>
    </>
  );
};

export default OtpVerification;
