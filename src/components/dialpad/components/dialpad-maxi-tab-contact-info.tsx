import { useMemo } from 'react';
import type { DialpadSession } from '@/context/dialpad-context';
import CreateContactNew from '@/pages/new-contact/create-new-contact';
import DialpadCampaignLeadDetails from './dialpad-campaign-lead-details';
import { useDialpad } from '@/hooks/use-dialpad';

type DialpadMaxiTabContactInfoProps = {
  activeSession: DialpadSession | null;
  typedNumber: string;
};

const DialpadMaxiTabContactInfo = ({
  activeSession,
  typedNumber,
}: DialpadMaxiTabContactInfoProps) => {
  const { refreshSessionContactInfo, campaignContactCards, activeCampaign } = useDialpad();
  const normalizedTypedNumber = typedNumber.trim();

  /**
   * The lead an agent is being shown in preview, before they press Call.
   *
   * In preview there is no session yet - the whole point is to read who you
   * are about to ring and decide - so this tab said "No active session
   * available" during the one moment it was needed, on a screen with a
   * countdown running. The pending card is the same one the preview panel
   * draws its name and number from, so the two cannot disagree.
   */
  const previewLead = useMemo(() => {
    const cards = Array.isArray(campaignContactCards) ? campaignContactCards : [];
    const card: any = cards[0];
    if (!card) return null;
    const number = String(card?.contactNumber ?? '').trim();
    const name = String(card?.contactName ?? '').trim();
    if (!number && !name) return null;
    return { number, name };
  }, [campaignContactCards]);
  const formContactData = useMemo(() => {
    const sessionContactInfo = activeSession?.contactInfo;
    if (!sessionContactInfo) return null;
    if (Array.isArray(sessionContactInfo))
      return sessionContactInfo.length ? sessionContactInfo : null;
    if (typeof sessionContactInfo === 'object') {
      return Object.keys(sessionContactInfo).length ? sessionContactInfo : null;
    }
    return sessionContactInfo;
  }, [activeSession?.contactInfo]);
  /**
   * The lead, in the shape the contact form hydrates from.
   *
   * Without this the form opened blank - "Enter first name" - next to a banner
   * naming the very person it was asking about. The lead's name and number are
   * already known, so they are filled in and the agent only adds what is
   * missing.
   *
   * No `_id`/`uuid` is set on purpose: those are what tell the form it is
   * editing an existing contact, and this lead is not one yet. Leaving them
   * out keeps Submit a create, not an overwrite of somebody else's record.
   */
  const previewContactData = useMemo(() => {
    if (!previewLead) return null;
    const parts = previewLead.name.split(/\s+/).filter(Boolean);
    return {
      name: { first: parts[0] || '', last: parts.slice(1).join(' ') },
      contact: { phone: previewLead.number, email: '' },
    };
  }, [previewLead]);

  /**
   * The whole lead record, not just the name and number the preview card shows.
   *
   * `campaignContactCards[0]` IS the stored lead - the campaign API returns the
   * full row and the preview panel only reads two fields off it - so the read
   * view gets everything: email, source, attempts, last outcome, notes. Falls
   * back to whatever the session carries once a call is up.
   */
  const campaignLead = useMemo(() => {
    const cards = Array.isArray(campaignContactCards) ? campaignContactCards : [];
    const card = cards[0];
    if (card && typeof card === 'object') return card as Record<string, any>;
    const sessionLead = (activeSession as any)?.campaignMetaData;
    if (sessionLead && typeof sessionLead === 'object') return sessionLead as Record<string, any>;
    return null;
  }, [activeSession, campaignContactCards]);

  /* A campaign call, or an agent sitting in a campaign waiting for one. Read
     off the same signals the rest of the dialer uses, so the tab cannot
     disagree with the panel beside it. */
  const isCampaignContext = Boolean(
    activeCampaign || campaignLead || (Array.isArray(campaignContactCards) && campaignContactCards.length),
  );

  const prefillPhone = useMemo(() => {
    /* No call yet, but a lead is on screen: that lead's number is what this
       form is about. Falls back to whatever was typed, as before. */
    if (!activeSession) return previewLead?.number || normalizedTypedNumber;
    if (formContactData) return '';
    return String(activeSession.remoteNumber || activeSession.extension || '').trim();
  }, [activeSession, formContactData, normalizedTypedNumber, previewLead]);

  return (
    /* On a campaign this tab sits directly on the panel: no card of its own and
       no forced full height. Stretching a bordered box to the bottom of a
       full-page layout drew a large empty rectangle under three lines of text,
       and the tab strip above already says "Contact Info", so the heading was
       saying it twice. */
    <div
      className={
        isCampaignContext
          ? 'min-h-0 overflow-y-auto pr-1'
          : 'h-full rounded-2xl border border-ucass-active-bg bg-white px-3 py-3 max-[380px]:px-2.5 max-[380px]:py-2.5 sm:px-4 sm:py-4'
      }
    >
      {isCampaignContext ? null : (
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a7396] max-[380px]:text-[10px] sm:text-xs">
          Contact Info
        </p>
      )}
      {/* On a campaign this tab is for READING the lead, so it shows the stored
          record. Everywhere else it stays the create-a-contact form, which is
          the right thing for a caller you do not know yet. */}
      {isCampaignContext ? (
        <DialpadCampaignLeadDetails lead={campaignLead} activeSession={activeSession} />
      ) : activeSession || previewLead ? (
        <CreateContactNew
          contactData={formContactData || previewContactData}
          prefillPhone={prefillPhone}
          hideCancelButton
          isDisable={false}
          setIsDisable={() => void 0}
          setDrawerState={() => void 0}
          keepFormDataAfterSave
          setTabData={(savedContact) => {
            if (activeSession?.id) refreshSessionContactInfo(activeSession.id, savedContact);
          }}
        />
      ) : (
        /* "No active session available" is true but useless to an agent sitting
           on a campaign waiting for work - it reads as a fault. Say which state
           they are actually in. */
        <p className="mt-2 text-[13px] text-[#6c809e] max-[380px]:text-xs sm:text-sm">
          {activeCampaign
            ? 'Waiting for the next contact on this campaign. Their details will appear here.'
            : 'No call in progress. Contact details appear here once a call starts.'}
        </p>
      )}
    </div>
  );
};

export default DialpadMaxiTabContactInfo;
