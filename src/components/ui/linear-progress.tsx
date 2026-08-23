import { cn } from '@/lib/utils';

type LinearProgressProps = {
  color?: string;
  outOfValue: number;
  taskDoneValue: number;
  className?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function LinearProgress({
  color = 'bg-primary',
  outOfValue,
  taskDoneValue,
  className,
}: LinearProgressProps) {
  const percentage = outOfValue > 0 ? clamp((taskDoneValue / outOfValue) * 100, 0, 100) : 0;

  return (
    <div className={cn('h-2 w-full rounded-full bg-gray-200', className)}>
      <div className={cn('h-full rounded-full', color)} style={{ width: `${percentage}%` }} />
    </div>
  );
}

export { LinearProgress };
