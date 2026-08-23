import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

import { cn } from '@/lib/utils';

function Label({
  className,
  htmlFor,
  ref,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const labelRef = React.useRef<HTMLLabelElement | null>(null);
  const generatedControlId = `control-${React.useId().replace(/:/g, '')}`;
  const [automaticHtmlFor, setAutomaticHtmlFor] = React.useState<string>();

  React.useLayoutEffect(() => {
    if (htmlFor) {
      setAutomaticHtmlFor(undefined);
      return;
    }

    const label = labelRef.current;
    const parent = label?.parentElement;
    if (!label || !parent) return;

    const controls = Array.from(
      parent.querySelectorAll<HTMLElement>(
        '[data-slot="checkbox"], [data-slot="radio-group-item"], [data-slot="switch"]',
      ),
    ).filter((control) => !label.contains(control));

    if (controls.length !== 1) {
      setAutomaticHtmlFor(undefined);
      return;
    }

    const control = controls[0];
    const controlId = control.id || generatedControlId;
    if (!control.id) control.id = controlId;
    setAutomaticHtmlFor(controlId);
  });

  return (
    <LabelPrimitive.Root
      ref={(node) => {
        labelRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      htmlFor={htmlFor || automaticHtmlFor}
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        (htmlFor || automaticHtmlFor) &&
          "relative cursor-pointer select-none after:absolute after:-inset-y-2 after:inset-x-0 after:content-['']",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
