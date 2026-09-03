import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        /* No enter/exit animation classes here, deliberately.
           Radix keeps a tooltip mounted until its exit animation reports
           finished, so the moment one of those animations stalls the
           tooltip is stuck on screen — and the next one is stuck invisible
           waiting on its own enter animation. That is observable: hovering
           along a row of triggers left three closed tooltips sitting at
           opacity 1 with their exit animation "running" but never
           progressing, while the newly opened one held at opacity 0. On
           screen that reads as the old name refusing to leave and the new
           name arriving late.
           These are 12px text labels; they do not need a fade. Showing and
           hiding them outright removes the dependency on an animation ever
           completing, so a tooltip can never outlive its trigger and the
           name changes the instant the pointer does. */
        className={cn(
          'bg-black text-primary-foreground z-[9999] w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-black" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
