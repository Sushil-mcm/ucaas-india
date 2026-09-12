import { useDialpad } from '@/hooks/use-dialpad';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useLocation } from 'react-router-dom';
import Dialpad from '.';
import ScreenCaptureController from './screen-capture-controller';
import type { DialpadMaxiTab } from './components/dialpad-maxi-side-panel';

type DragPosition = {
  x: number;
  y: number;
};

type DragBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type DragState = {
  isDragging: boolean;
  pointerId: number | null;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

const clamp = (value: number, min: number, max: number) => {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};

const clampDragPosition = (position: DragPosition, bounds: DragBounds): DragPosition => ({
  x: clamp(position.x, bounds.left, bounds.right),
  y: clamp(position.y, bounds.top, bounds.bottom),
});

const shouldCancelDragFromTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return true;
  return Boolean(
    target.closest(
      'button,input,textarea,select,option,a,[role="button"],[data-dialpad-drag-cancel="true"]',
    ),
  );
};

const toPixelNumber = (value?: string) => {
  const parsedValue = Number.parseFloat(value || '');
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const DialpadGlobalOverlay = () => {
  const { isDialpadOpen, modalSize, activeCampaign, joinedCampaignId, campaignContactCards } =
    useDialpad();
  const location = useLocation();
  const isDialpadRoute = location.pathname.startsWith('/phone');
  const isMaxiMode = modalSize === 'maxi';

  /**
   * A campaign dialer takes the whole page; every other dialer keeps its box.
   *
   * An agent working a campaign is not glancing at a call - they are reading a
   * lead, following a script, taking notes and dispositioning, one after
   * another for a whole shift. That work does not fit a floating panel with
   * margins, and it was being squeezed into one. A normal call is the opposite:
   * you want it small and out of the way while you use the rest of the app.
   *
   * So the size is decided by what the dialer is FOR, not by which button was
   * pressed. The manual expand button still gives an ordinary call the wide
   * two-column view inside its box, exactly as before - only a campaign goes
   * full page.
   *
   * The test is the one the dialpad itself uses, to the letter: an empty card
   * array still means "in a campaign, waiting for the next lead", and treating
   * that as "no campaign" would shrink the frame out from under an agent
   * between calls.
   */
  const isCampaignDialer = Boolean(
    String(activeCampaign?._id || '').trim() ||
      String(joinedCampaignId || '').trim() ||
      campaignContactCards !== null,
  );
  const isFullPage = isMaxiMode && isCampaignDialer;
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const draggableNodeRef = useRef<HTMLDivElement | null>(null);
  const hasPositionedOnOpenRef = useRef(false);
  const dragPositionRef = useRef<DragPosition>({ x: 0, y: 0 });
  const dragBoundsRef = useRef<DragBounds>({ left: 0, top: 0, right: 0, bottom: 0 });
  const dragAnimationFrameRef = useRef<number | null>(null);
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startX: 0,
    startY: 0,
  });
  const [overlayMaxiTabOverride, setOverlayMaxiTabOverride] = useState<DialpadMaxiTab | null>(null);

  const frameClassName = useMemo(
    () =>
      isFullPage
        ? /* No rounding, no shadow, no width cap: it IS the page. */
          'pointer-events-auto h-full w-full bg-white overflow-hidden'
        : `pointer-events-auto rounded-[24px] bg-white shadow-[0px_12px_50px_0px_rgba(0,_0,_0,_0.3)] ${
            isMaxiMode
              ? 'h-full w-full max-w-[calc(100dvw-6rem)] max-h-[calc(100dvh-2rem)] overflow-hidden'
              : 'max-h-[calc(100dvh-2rem)] max-w-[calc(100dvw-400px)] overflow-hidden md:max-w-[min(100%,300px)] lg:max-w-[min(100%,300px)] xl:max-w-[min(100%,430px)]'
          }`,
    [isFullPage, isMaxiMode],
  );
  const frameStyle = useMemo<CSSProperties>(
    () =>
      isFullPage || isMaxiMode
        ? {}
        : modalSize === 'mini'
          ? {
              height: 'min(760px, calc(100dvh - 2rem))',
            }
          : {
              height: 'auto',
            },
    [isFullPage, isMaxiMode, modalSize],
  );
  const draggableFrameStyle = useMemo<CSSProperties>(
    () =>
      /* Dragging a full-page panel only ever moves it off screen, and a stale
         transform left over from a previous drag would do exactly that the
         moment a campaign opens. Full page is pinned. */
      isFullPage
        ? { ...frameStyle, transform: 'none' }
        : {
            ...frameStyle,
            transform: `translate3d(${dragPositionRef.current.x}px, ${dragPositionRef.current.y}px, 0)`,
            willChange: 'transform',
          },
    [frameStyle, isFullPage],
  );

  const applyDragTransform = useCallback((position: DragPosition) => {
    const frameNode = draggableNodeRef.current;
    if (!frameNode) return;

    frameNode.style.transform = `translate3d(${Math.round(position.x)}px, ${Math.round(position.y)}px, 0)`;
  }, []);

  const commitDragPosition = useCallback(
    (position: DragPosition) => {
      dragPositionRef.current = position;

      if (dragAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(dragAnimationFrameRef.current);
        dragAnimationFrameRef.current = null;
      }

      applyDragTransform(position);
    },
    [applyDragTransform],
  );

  const scheduleDragTransform = useCallback(
    (position: DragPosition) => {
      dragPositionRef.current = position;

      if (dragAnimationFrameRef.current !== null) return;

      dragAnimationFrameRef.current = window.requestAnimationFrame(() => {
        dragAnimationFrameRef.current = null;
        applyDragTransform(dragPositionRef.current);
      });
    },
    [applyDragTransform],
  );

  const syncDragBounds = useCallback(
    (placeAtBottomRight = false) => {
      const overlayNode = overlayRef.current;
      const frameNode = draggableNodeRef.current;
      if (!overlayNode || !frameNode) return;

      const overlayStyles = window.getComputedStyle(overlayNode);
      const horizontalPadding =
        toPixelNumber(overlayStyles.paddingLeft) + toPixelNumber(overlayStyles.paddingRight);
      const verticalPadding =
        toPixelNumber(overlayStyles.paddingTop) + toPixelNumber(overlayStyles.paddingBottom);
      const availableWidth = Math.max(0, overlayNode.clientWidth - horizontalPadding);
      const availableHeight = Math.max(0, overlayNode.clientHeight - verticalPadding);
      const frameWidth = frameNode.offsetWidth;
      const frameHeight = frameNode.offsetHeight;

      const maxX = Math.max(0, availableWidth - frameWidth);
      const maxY = Math.max(0, availableHeight - frameHeight);

      dragBoundsRef.current = {
        left: 0,
        top: 0,
        right: maxX,
        bottom: maxY,
      };

      const nextPosition = placeAtBottomRight
        ? { x: maxX, y: maxY }
        : clampDragPosition(dragPositionRef.current, dragBoundsRef.current);

      commitDragPosition(nextPosition);
    },
    [commitDragPosition],
  );

  const handleDragPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('.dialpad-overlay-drag-handle')) return;
    if (shouldCancelDragFromTarget(target)) return;

    const frameNode = draggableNodeRef.current;
    if (!frameNode) return;

    event.preventDefault();

    const currentPosition = dragPositionRef.current;
    dragStateRef.current = {
      isDragging: true,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: currentPosition.x,
      startY: currentPosition.y,
    };

    frameNode.setPointerCapture(event.pointerId);
    frameNode.classList.add('dialpad-overlay-dragging');
  }, []);

  const handleDragPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState.isDragging || dragState.pointerId !== event.pointerId) return;

      event.preventDefault();

      const nextPosition = clampDragPosition(
        {
          x: dragState.startX + event.clientX - dragState.startClientX,
          y: dragState.startY + event.clientY - dragState.startClientY,
        },
        dragBoundsRef.current,
      );

      scheduleDragTransform(nextPosition);
    },
    [scheduleDragTransform],
  );

  const finishDrag = useCallback(
    (event?: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState.isDragging) return;
      if (event && dragState.pointerId !== event.pointerId) return;

      const frameNode = draggableNodeRef.current;
      if (frameNode && dragState.pointerId !== null) {
        if (frameNode.hasPointerCapture(dragState.pointerId)) {
          frameNode.releasePointerCapture(dragState.pointerId);
        }
        frameNode.classList.remove('dialpad-overlay-dragging');
      }

      dragStateRef.current = {
        isDragging: false,
        pointerId: null,
        startClientX: 0,
        startClientY: 0,
        startX: 0,
        startY: 0,
      };

      commitDragPosition(clampDragPosition(dragPositionRef.current, dragBoundsRef.current));
    },
    [commitDragPosition],
  );

  useEffect(() => {
    if (isDialpadRoute || !isDialpadOpen) {
      hasPositionedOnOpenRef.current = false;
      return;
    }

    const shouldPlaceAtBottomRight = !hasPositionedOnOpenRef.current;
    hasPositionedOnOpenRef.current = true;

    const frame = window.requestAnimationFrame(() => {
      syncDragBounds(shouldPlaceAtBottomRight);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isDialpadOpen, isDialpadRoute, syncDragBounds]);

  useEffect(() => {
    if (isDialpadRoute || !isDialpadOpen) return;

    const frame = window.requestAnimationFrame(() => {
      // Keep the current drag location when switching mini/micro/maxi,
      // but clamp into visible bounds so the panel never hides off-screen.
      syncDragBounds(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isDialpadOpen, isDialpadRoute, modalSize, syncDragBounds]);

  useEffect(() => {
    if (isDialpadRoute || !isDialpadOpen) return;

    const handleResize = () => syncDragBounds(false);
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      syncDragBounds(false);
    });

    if (overlayRef.current) resizeObserver.observe(overlayRef.current);
    if (draggableNodeRef.current) resizeObserver.observe(draggableNodeRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [isDialpadOpen, isDialpadRoute, syncDragBounds]);

  useEffect(() => {
    return () => {
      if (dragAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(dragAnimationFrameRef.current);
        dragAnimationFrameRef.current = null;
      }
    };
  }, []);

  if (isDialpadRoute) return null;

  return (
    <>
      {/* Agent screen capture lives beside the dialpad, not inside it: its
          pill must stay visible while the dialpad is closed. */}
      <ScreenCaptureController />
    <div
      ref={overlayRef}
      aria-hidden={!isDialpadOpen}
      className={`pointer-events-none fixed inset-0 z-[1300] overflow-hidden ${
        isFullPage ? 'p-0' : 'p-4'
      } ${isDialpadOpen ? 'visible' : 'invisible'}`}
    >
      <div
        ref={draggableNodeRef}
        className={frameClassName}
        style={draggableFrameStyle}
        onPointerDown={isFullPage ? undefined : handleDragPointerDown}
        onPointerMove={isFullPage ? undefined : handleDragPointerMove}
        onPointerUp={isFullPage ? undefined : finishDrag}
        onPointerCancel={isFullPage ? undefined : finishDrag}
      >
        <Dialpad
          mode="overlay"
          overlayMaxiTabOverride={overlayMaxiTabOverride}
          onOverlayMaxiTabOverrideChange={setOverlayMaxiTabOverride}
        />
      </div>
    </div>
    </>
  );
};

export default DialpadGlobalOverlay;
