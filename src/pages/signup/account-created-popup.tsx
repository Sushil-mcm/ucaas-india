import { CloseIcon } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import { SmileIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AccountCreatedPopup = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="flex flex-col gap-1.5 p-3 bg-ucass-primary-200 text-primary rounded-xl border border-gray-200">
        <div className="font-semibold truncate text-md flex items-center justify-between">
          Account created
          <div
            onClick={() => navigate('/')}
            className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
          >
            <CloseIcon className="w-3 h-3" />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="bg-gray-100 border border-gray-200 w-20 h-20 rounded-full flex items-center justify-center">
          <SmileIcon />
        </div>
        <h3 className=" text-2xl font-semibold text-center">Congratulations!</h3>
      </div>
      <h4 className=" font-medium text-xl text-center">
        Welcome aboard! 🎉 Your signup is complete.!
      </h4>
      <p className="text-gray-800 text-base font-normal text-center">
        {/* <span className="font-semibold text-primary">
          We’ve sent your login credentials to your registered email.{' '}
        </span> */}
        Using the credentials sent to your email, you can now sign in to start calling, messaging,
        and managing your communications.
      </p>
      <div className="flex justify-end">
        <Button onClick={() => navigate('/')} type="button">
          Login Now
        </Button>
      </div>
    </>
  );
};

export default AccountCreatedPopup;
