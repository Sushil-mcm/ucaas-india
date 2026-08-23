import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { NoticeLine } from '@/assets/icons';

const ErrorTooltip = ({ text }: any) => {
  return (
    <Tooltip>
      <TooltipTrigger className="flex items-center cursor-pointer">
        <NoticeLine className="w-3.5 h-3.5 text-red-500 cursor-pointer" />
      </TooltipTrigger>
      <TooltipContent side="right">{text}</TooltipContent>
    </Tooltip>
  );
};

export default ErrorTooltip;
