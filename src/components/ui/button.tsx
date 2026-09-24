import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex touch-manipulation cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        /* Hover goes to the deep orange, not the brand orange. Two reasons,
           and the first one is measurable: white on #f2994a is a contrast
           ratio of 2.2:1, which is below any legibility floor - the label
           was there and simply could not be read. (It started as
           `bg-primary/90`, orange at 90% alpha, which also composited
           against the cream page into a muddy brown.) #b3601a carries
           white at 4.6:1, and it is the shade the console's own hand-built
           buttons already hover to. */
        default:
          'bg-ucass-primary-200 border border-primary text-primary shadow-xs hover:bg-[#b3601a] hover:border-[#b3601a] hover:text-white active:bg-[#98510f] active:border-[#98510f] cursor-pointer min-h-10',
        primary:
          'bg-primary border border-primary text-white shadow-xs hover:bg-primary/90 cursor-pointer min-h-10',
        variantIcon: 'bg-primary text-primary shadow-xs hover:bg-primary/90 cursor-pointer',
        destructive:
          'bg-destructive border border-destructive text-white shadow-xs hover:bg-destructive/90 cursor-pointer min-h-10',
        destructiveOutline:
          'bg-red-50 border border-red-200 text-red-600 shadow-xs  cursor-pointer min-h-10',
        /* Same shade, same reason as `default` above: a white label needs a
           dark enough fill under it to be read at all. */
        outline:
          'bg-white border border-primary text-primary shadow-xs hover:bg-[#b3601a] hover:border-[#b3601a] hover:text-white cursor-pointer min-h-10',
        secondary:
          'bg-gray-100 border border-gray-200 text-gray-900 shadow-xs hover:bg-gray-100/90 cursor-pointer min-h-10',
        /* `hover:text-accent-foreground`, not `hover:text-accent`: the latter
           painted the label the same token as the background beside it, so a
           ghost button's text vanished into its own fill on hover. Inside the
           console `--accent` is locked to the brand orange, which made it a
           solid orange pill with nothing on it. */
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
        transparent: 'text-gray-700 hover:text-primary cursor-pointer',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5 min-h-8 text-xs',
        lg: 'h-10 rounded-lg px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
