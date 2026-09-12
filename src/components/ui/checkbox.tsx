import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { CheckIcon, MinusIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  /* A "select all" box over a list where only some rows are ticked passes
     checked="indeterminate". The primitive's Indicator renders for that state
     exactly as it does for checked, so the box showed a full tick with one of
     nine rows selected. A dash is the sign every desktop uses for "some". */
  const isIndeterminate = props.checked === 'indeterminate';
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative after:absolute after:-inset-2 after:content-[''] dark:bg-input/30 data-[state=checked]:shadow-md data-[state=indeterminate]:bg-primary/15 data-[state=indeterminate]:text-primary data-[state=indeterminate]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-[17px] shrink-0 rounded-[4px] shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer touch-manipulation border-[1.5px] border-gray-500 bg-white hover:border-[var(--accent,#2563eb)] data-[state=checked]:!bg-[var(--accent,#2563eb)] data-[state=checked]:!border-[var(--accent,#2563eb)] data-[state=checked]:!text-white",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        {isIndeterminate ? (
          <MinusIcon className="size-3.5 stroke-[3]" />
        ) : (
          <CheckIcon className="size-3.5 stroke-[2.5]" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
