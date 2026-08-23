import { UserPlus } from 'lucide-react';

type DialpadContactLinkProps = {
  onClick?: () => void;
};

const DialpadContactLink = ({ onClick }: DialpadContactLinkProps) => {
  return (
    <div className="mb-2 flex justify-center max-[380px]:mb-1.5 sm:mb-2.5 md:mb-1">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 text-[13px]  text-[#8a98ae] transition hover:text-primary max-[380px]:text-[10.5px] sm:text-[12px] md:text-[12px]"
      >
        <UserPlus className="h-3.5 w-3.5 max-[380px]:h-3 max-[380px]:w-3 sm:h-3.5 sm:w-3.5" />
        Add new contact
      </button>
    </div>
  );
};

export default DialpadContactLink;
