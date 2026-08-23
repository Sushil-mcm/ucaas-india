import { Button } from '@/components/ui/button';
import { OctagonXIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PaymentFailedPopup = ({ handleClose, isLogin }: any) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    handleClose();
    if (!isLogin) navigate('/');
  };

  return (
    <>
      <div className="flex flex-col gap-1.5 p-3 bg-ucass-primary-200 text-primary rounded-xl border border-gray-200"></div>
      {!isLogin && (
        <h4 className=" font-semibold text-xl text-center">
          Your account has been created successfully!
        </h4>
      )}
      <div className="flex gap-2 items-center justify-center">
        <OctagonXIcon className="w-6 h-6 text-red-500" />
        <h4 className=" font-medium text-md">Your Payment has Failed!</h4>
      </div>
      {!isLogin && (
        <p className="text-grey-800 text-sm font-normal text-center">
          To complete your payment, please log in using the credentials sent to your email.
        </p>
      )}
      <div className="flex justify-end w-full">
        <Button onClick={handleLogin} type="button">
          {!isLogin ? 'Login Now' : 'Retry'}
        </Button>
      </div>
    </>
  );
};

export default PaymentFailedPopup;
