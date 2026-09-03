import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

const CustomTooltip = ({
  text,
  children,
  side = 'right',
  className = '',
}: {
  text: string | React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}) => {
  return (
    /* `disableHoverableContent` turns off Radix's grace area — the invisible
       polygon it keeps alive between a trigger and its open tooltip so the
       pointer can travel into the tooltip itself without it closing. That is
       worth having for a tooltip you can interact with; every tooltip in this
       app is a short piece of read-only text, so all it does here is keep the
       previous tooltip alive while the pointer is already on its way to the
       next trigger. On a row of adjacent triggers (the member avatar stacks,
       row action icons) that reads as the name being slow to change: the old
       one is still lingering out its grace period while the new one is
       opening. With it off, leaving a trigger closes immediately and the next
       one opens on its own, so moving along a row switches names cleanly. */
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {text}
      </TooltipContent>
    </Tooltip>
  );
};

export default CustomTooltip;
