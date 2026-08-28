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
            `fixed inset-0 ${isHeader ? 'z-30' : 'z-10'}  bg-black/50 transition-opacity`,
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'data-[state=open]:fade-in-0',
            backgroundStyle,
          )}
        ></div>
      )}

      <div
        id="drawer-example"
        className={cn(
          `fixed top-0 shadow-lg bg-white right-0 ${isHeader ? 'z-30' : 'z-10'} transition-transform ease-in-out duration-300 backdrop-blur-md gap-4 flex flex-col`,
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
              'flex min-h-11 items-center justify-between gap-1.5 px-5 text-gray-900',
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
              'absolute right-4 top-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center',
              'rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors',
              'hover:bg-gray-100 hover:text-gray-900',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            )}
          >
            <Icon name="CloseIcon" className="h-4 w-4" />
          </button>
        )}

        <div className="flex-1 min-h-0 w-full flex flex-col gap-4 overflow-auto md:overflow-hidden px-4 lg:px-5 pt-0 pb-5">
          {content}
        </div>
      </div>
    </>
  );
};

export default SideDrawer;
