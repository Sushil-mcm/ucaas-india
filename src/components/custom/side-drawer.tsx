import { FC, useEffect, useState } from 'react';
import { Icon } from '@/assets/icons/icon';
import { cn } from '@/lib/utils';

interface SideDrawerProps {
  title?: string;
  handleClose: () => void;
  content: React.ReactNode;
  isOpen: boolean;
  width?: string;
  responsiveWidth?: string;
  responsiveBreakpoint?: number;
  isHeader?: boolean;
  isTab?: boolean;
  backgroundStyle?: string;
  enableResponsive?: boolean;
  isCloseIcon?: boolean;
  headerClassName?: string;
}

const SideDrawer: FC<SideDrawerProps> = ({
  title,
  handleClose,
  content,
  isOpen,
  width = '',
  responsiveWidth = '',
  responsiveBreakpoint = 1280,
  isHeader,
  isTab = true,
  backgroundStyle = '',
  enableResponsive = false,
  isCloseIcon = true,
  headerClassName = '',
}) => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    if (!enableResponsive) return;

    const checkSize = () => setIsSmallScreen(window.innerWidth < responsiveBreakpoint);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, [enableResponsive, responsiveBreakpoint]);

  const finalIsTab = enableResponsive ? (isTab ?? isSmallScreen) : isTab;
  const finalWidth = enableResponsive
    ? isSmallScreen
      ? responsiveWidth || width || '90%'
      : width
    : width;
  return (
    <>
      {isHeader && (
        <div
          data-state={isOpen ? 'open' : 'closed'}
          className={cn(
            `fixed inset-0 ${isHeader ? 'z-30' : 'z-10'} bg-black/50 transition-opacity duration-300 ease-in-out`,
            /* Plain opacity transition rather than the animate-in/out
               keyframe utilities: those play on first paint regardless of
               prior state, which flashes the backdrop the instant a
               permanently-mounted drawer (see the notification drawer in
               header/index.tsx) loads still closed. A transition only
               plays when the class actually changes. */
            isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
            backgroundStyle,
          )}
        ></div>
      )}

      <div
        id="drawer-example"
        className={cn(
          `fixed top-0 shadow-lg bg-[rgba(251,249,246,0.88)] right-0 ${isHeader ? 'z-30' : 'z-10'} transition-transform ease-in-out duration-300 backdrop-blur-[12px] gap-4 flex flex-col`,
          enableResponsive && isSmallScreen ? 'min-w-0 max-w-full' : 'min-w-84 sm:min-w-100',
          isHeader ? 'mt-0 h-full' : 'mt-16 h-[calc(100vh_-_4rem)]',
          isOpen ? 'translate-x-0 right-0' : 'translate-x-full right-[-1rem]',
        )}
        aria-labelledby="drawer-label"
        style={{
          width:
            finalWidth ||
            `${finalIsTab ? 'calc(100% - 22rem - 5rem)' : 'calc(100% - 16rem - 5rem)'}`,
        }}
      >
        {title && (
          <div
            className={cn(
              'flex min-h-11 items-center justify-between gap-1.5 px-5 text-[#2E2D35]',
              /* Room for the close button so a long title cannot run underneath it. */
              isCloseIcon && 'pr-16',
              headerClassName,
            )}
          >
            <h5
              id="drawer-label"
              className="font-semibold truncate text-base flex items-center justify-between"
            >
              {title}
            </h5>
          </div>
        )}
        {isCloseIcon && (
          /* Top-right, one size at every breakpoint. This was a 24px circle
             holding an 8px glyph at left-[-.8rem] — half of it outside the panel
             and unclickable — coloured red, which reads as "delete", with a hover
             class that was not a real Tailwind utility so hovering did nothing.
             Right rather than left because 56 of the drawers in this app render a
             left-aligned title along the top, and a button inside the panel on
             that side would sit on top of the words. */
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            title="Close"
            className={cn(
              'group absolute right-8 top-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center',
              'rounded-full border border-[#EEE7DD] bg-[rgba(251,249,246,0.88)] text-[#9A948F] shadow-sm',
              'transition-all duration-200 ease-out',
              'hover:bg-[#FBE2C8]/40 hover:text-[#2E2D35] hover:scale-110 hover:shadow-md',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            )}
          >
            <Icon
              name="CloseIcon"
              className="h-4 w-4 transition-transform duration-200 ease-out group-hover:rotate-90"
            />
          </button>
        )}

        <div
          className={cn(
            'flex-1 min-h-0 w-full flex flex-col gap-4 overflow-auto md:overflow-hidden px-4 lg:px-5 pb-5',
            /* No title row means nothing reserves space for the floating
               close button above, so the content's own heading runs
               underneath it - give the content the same clearance a title
               row would have provided. */
            title || !isCloseIcon ? 'pt-0' : 'pt-14',
          )}
        >
          {content}
        </div>
      </div>
    </>
  );
};

export default SideDrawer;
