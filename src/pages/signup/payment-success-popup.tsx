import { CloseIcon } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PaymentSuccessPopup = ({
  isLogin,
  signUpResponseData,
  didCountries,
  accessToken,
  planUuid,
}: any) => {
  const navigate = useNavigate();

  return (
    <>
      {/* <div className="flex flex-col gap-1.5 p-3 bg-ucass-primary-200 text-primary rounded-xl border border-gray-200">
        <div className="font-semibold truncate text-md flex items-center justify-between">
          Account created
          <div
            onClick={() => navigate('/')}
            className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
          >
            <CloseIcon className="w-3 h-3" />
          </div>
        </div>
      </div> */}
      <div className="flex flex-col gap-1.5  text-900/80">
        <div className="font-semibold truncate text-md flex items-center justify-between">
          Account created
          <div
            onClick={() => navigate('/')}
            className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
          >
            <CloseIcon className="w-3 h-3" />
          </div>
        </div>
      </div>
      {!isLogin ? (
        <>
          <h4 className="font-semibold text-xl text-center">
            Your account has been created successfully!
          </h4>
          <div className="font-medium text-md text-center">
            We’ve sent your login credentials to your registered email.{' '}
          </div>
          <p className="text-grey-800 text-sm font-normal text-center">
            Do you want to proceed further to add DID to your account?
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <h4 className=" font-medium text-xl text-center ">Payment has done successfully!</h4>
          <p className="text-grey-800 text-base font-normal text-center">
            Do you want to proceed further to add DID to your account?
          </p>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant={'transparent'} type="button" onClick={() => navigate('/')}>
          Cancel
        </Button>
        <Button
          type="button"
          variant={'outline'}
          onClick={() =>
            navigate('/phone-lines', {
              state: {
                isLogin,
                signUpResponseData,
                didCountries,
                planUuid,
                accessToken:
                  accessToken ||
                  signUpResponseData?.current?.token ||
                  signUpResponseData?.token ||
                  '',
              },
            })
          }
        >
          <p className="flex items-center justify-center gap-2">{'Proceed'}</p>
        </Button>
      </div>
    </>
  );
};

export default PaymentSuccessPopup;
