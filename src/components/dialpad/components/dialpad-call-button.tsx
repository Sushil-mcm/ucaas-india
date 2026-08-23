import { FaPhone } from '@/assets/icons';

type DialpadCallButtonProps = {
  canCall: boolean;
  onCall: () => void;
};

const DialpadCallButton = ({ canCall, onCall }: DialpadCallButtonProps) => {
  return (
    <div className="flex justify-center mb-1 xl:mb-2">
      <button
        type="button"
        onClick={onCall}
        disabled={!canCall}
        className={`group flex aspect-square w-full max-w-[42px] items-center justify-center justify-self-center rounded-full  text-[#2a4362] shadow-[0_4px_8px_rgba(33,56,90,0.08)] transition duration-150 active:scale-95 max-[380px]:max-w-[40px] sm:max-w-[46px] md:max-w-[50px] xl:max-w-[54px] xxl:max-w-[70px] ${
          canCall ? 'bg-green-600 text-white  hover:bg-green-700' : 'bg-[#c8d2e1] text-white'
        }`}
        aria-label="Call"
      >
        <FaPhone className="-scale-x-100 h-4 w-4 max-[380px]:h-3.5 max-[380px]:w-3.5 sm:h-[17px] sm:w-[17px] md:h-4.5 md:w-4.5 xl:h-6 lg:w-6" />
      </button>
    </div>
  );
};

export default DialpadCallButton;
