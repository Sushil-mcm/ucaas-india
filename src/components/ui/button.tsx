import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex touch-manipulation cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        default:
          'bg-ucass-primary-200 border border-primary text-primary shadow-xs hover:bg-primary/90 hover:text-white cursor-pointer min-h-10',
        primary:
          'bg-primary border border-primary text-white shadow-xs hover:bg-primary/90 cursor-pointer min-h-10',
        variantIcon: 'bg-primary text-primary shadow-xs hover:bg-primary/90 cursor-pointer',
        destructive:
          'bg-destructive border border-destructive text-white shadow-xs hover:bg-destructive/90 cursor-pointer min-h-10',
        destructiveOutline:
          'bg-red-50 border border-red-200 text-red-600 shadow-xs  cursor-pointer min-h-10',
        outline:
          'bg-white border border-primary text-primary shadow-xs hover:bg-primary/90 hover:text-white cursor-pointer min-h-10',
        secondary:
          'bg-gray-100 border border-gray-200 text-gray-900 shadow-xs hover:bg-gray-100/90 cursor-pointer min-h-10',
        ghost: 'hover:bg-accent hover:text-accent dark:hover:bg-accent/50',
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
