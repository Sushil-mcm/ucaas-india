import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import Loader from '../custom/loader';

interface SpinProps {
  loading: boolean;
  children: ReactNode;
  className?: string;
}

const Spin: FC<SpinProps> = ({ loading, children, className }) => {
  return (
    <div className={cn('relative', className)}>
      <div className={loading ? 'pointer-events-none opacity-60' : ''}>{children}</div>

      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60">
          <Loader variant="blue" />
        </div>
      )}
    </div>
  );
};

export default Spin;
