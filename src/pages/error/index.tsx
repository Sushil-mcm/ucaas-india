import MetaLogo from '@/assets/images/Error-404.svg';
import { Button } from '@/components/ui/button';
const ErrorPage = ({ text = '' }: { text: string }) => {
  return (
    <div className="w-screen min-h-screen bg-white ">
      {/* <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2  bg-white "> */}
      <div className="w-full h-full min-h-screen flex flex-col items-center justify-center gap-3  bg-white ">
        <img src={MetaLogo} alt="Meta logo" className="w-full max-w-56" />
        <div className="flex items-center justify-center text-2xl font-bold text-gray-700">
          {text}
        </div>
        {/* <div className="flex items-center justify-center text-md font-normal text-gray-500">{text}</div> */}
        <Button variant={'outline'} onClick={() => (window.location.href = '/')}>
          Go To Homepage
        </Button>
      </div>
    </div>
  );
};

export default ErrorPage;
