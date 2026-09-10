import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';

/**
 * Shared "queue/IVR details" popup for every call-log report's clickable
 * "To" link (Billing, Onboarding, Callback Offer, ...). Originally lived
 * only in call-history/index.tsx, duplicated by hand into Local Call
 * List/Outbound/Inbound/Voicemail would have been exactly how the two
 * drift apart the next time either one gets a tweak — one component
 * instead, imported everywhere the same click needs the same popup.
 *
 * Only reached when a caller opts in via its own `detailsAsModal` prop —
 * every one of these reports also renders standalone (a full Reports page)
 * or embedded in the Home Live Wallboard, where the plain `<SideDrawer
 * isTab>` stays the right affordance. `detailsAsModal` exists for exactly
 * one case: this same content opened from *inside* another already-open
 * Dialog (Performance ▸ Calls, or the "Open a full report page" modal) —
 * a `<SideDrawer>` there is a second portal stacking underneath the first
 * one's Radix z-index, technically open but invisible.
 */
const DetailsModal = ({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <Dialog
    open={isOpen}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <DialogContent
      showCloseButton={false}
      className="qdv-modal max-w-5xl w-full max-h-[88vh] overflow-y-auto rounded-[20px] bg-[#fffdfb] backdrop-blur-[20px] border border-[rgba(249,115,22,0.18)] shadow-[0_20px_50px_rgba(160,95,30,0.22)] p-0 gap-0"
      overlayClassName="bg-black/30 backdrop-blur-sm"
    >
      <DialogTitle className="sr-only">Details</DialogTitle>
      <DialogClose
        aria-label="Close"
        className="absolute top-[18px] right-6 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[rgba(249,115,22,0.2)] bg-[#fff7ed] text-[#8a6f57] transition-all hover:bg-[#ffedd5] hover:text-[#1a1a1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <X className="h-4 w-4" />
      </DialogClose>
      {/* pt-12 clears the close button (top-[18px], h-8 — a 32px button
          with 18px of headroom) without a separate header row eating its
          own extra space above — a drawer's blanket `pt-14` (reserved for
          every drawer's floating close button regardless of content)
          would leave a large, awkward empty space above Queue Info. */}
      <div className="pt-12 px-6 pb-6">{children}</div>
    </DialogContent>
  </Dialog>
);

export default DetailsModal;
