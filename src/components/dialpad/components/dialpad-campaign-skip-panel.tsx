import type { CampaignSkipRequest } from '@/context/dialpad-context';
import { useDialpad } from '@/hooks/use-dialpad';
import { useUser } from '@/hooks/use-user';
import { addDispositionInLeadContatc, getDispositions } from '@/services/api';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { handleAlert } from '@/lib/utils';
import { Loader2, SkipForward, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type DialpadCampaignSkipPanelProps = {
  request: CampaignSkipRequest;
};

/**
 * Why an agent is putting a lead down, asked on the right where there is room
 * to answer properly.
 *
 * The reason chips used to live on the lead card itself, in a strip about
 * 320px wide, and a skip fired the moment one was tapped. There was nowhere to
 * write the part a supervisor actually reads — "wrong person, he works nights"
 * rather than a bare "Not interested".
 *
 * The description is saved to the lead's own disposition record
 * (call_notes_with_disposition, the same store the post-call screen writes to),
 * NOT onto the lead row. That matters: the lead schema is strict and has no
 * field for it, so a note written there is dropped without an error. This store
 * already accepts a note object and is already read by the contact's activity.
 */
const DialpadCampaignSkipPanel = ({ request }: DialpadCampaignSkipPanelProps) => {
  const { setCampaignSkipRequest } = useDialpad();
  const { user } = useUser();
  const [selectedId, setSelectedId] = useState('');
  const [dispositionId, setDispositionId] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const close = () => setCampaignSkipRequest(null);

  /* The dispositions the campaign switched on for its agents. A campaign that
     has none switched on still deserves a list to pick from, so the company's
     own agent dispositions stand in — the same names the campaign screen
     offers an admin. */
  const campaignDispositions = Array.isArray(request.dispositions) ? request.dispositions : [];
  const { data: fallbackDispositions = [] } = useQuery({
    queryKey: ['skip-panel-agent-dispositions'],
    queryFn: () => getDispositions({ page: 1, limit: 200 }),
    select: (data: any) =>
      (data?.data?.data?.result?.rows || [])
        .filter((row: any) => String(row?.dispositionType || '').toLowerCase() === 'agent')
        .map((row: any) => ({ _id: String(row?._id || ''), name: String(row?.disposition?.name || '').trim() }))
        .filter((row: any) => row._id && row.name),
    enabled: campaignDispositions.length === 0 && (request.reasons || []).length === 0,
    staleTime: 60 * 60 * 1000,
  });
  /* When the campaign HAS named its skip reasons, those are the whole answer:
     the panel offers exactly the ones an admin ticked and nothing else. It used
     to show the ticked reasons AND then every agent disposition underneath, so
     an admin who carefully picked two reasons saw all seven on screen and the
     choice they made looked ignored.
     The full list survives only as the fallback for a campaign with no skip
     reasons set up at all - without it that campaign's skip panel would offer
     nothing to record against the lead, and the note below already explains
     which of the two cases the agent is in. */
  const hasConfiguredReasons = (request.reasons || []).length > 0;
  const dispositionOptions: { _id: string; name: string }[] = hasConfiguredReasons
    ? []
    : campaignDispositions.length
      ? campaignDispositions
      : fallbackDispositions;
  const selectedDisposition = useMemo(
    () => dispositionOptions.find((option) => option._id === dispositionId),
    [dispositionOptions, dispositionId],
  );

  const selectedReason = request.reasons.find((reason) => reason._id === selectedId);
  /* One disposition travels with the skip. A skip reason is a disposition too,
     so whichever the agent touched last is the one that is recorded. */
  const selected = selectedDisposition || selectedReason;
  /* A campaign with no skip reasons configured still gets a note box: the
     description is worth having on its own, and the confirm button then only
     needs one of the two to be filled in. */
  const hasReasons = request.reasons.length > 0;
  const canConfirm = (hasReasons ? Boolean(selected) : true) && !isSaving;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    const trimmedNote = note.trim();
    setIsSaving(true);

    /* The note and the disposition are saved first and the skip second. If the
       save fails the lead stays where it is and the agent can try again —
       losing the sentence but keeping the lead is the right way round.
       A disposition on its own is worth writing too: the skip event carries it
       to the switch, but the contact's own activity is read from this store. */
    if (trimmedNote || selected) {
      try {
        const extension = String(user?.user_info?.extension || '').trim();
        const userName = `${String(user?.user_info?.first_name || '').trim()} ${String(
          user?.user_info?.last_name || '',
        ).trim()}`.trim();

        await addDispositionInLeadContatc({
          source: 'LEAD',
          /* The server matches on contactPhone alone when no call id is given,
             and then $sets the disposition on whatever it finds. Left to that,
             a skip would land on — and overwrite the disposition of — an
             earlier CALL to the same number. Giving the skip its own id makes
             the upsert create its own row and leaves call records alone. */
          sipCallId: `skip-${request.campaignNumberId || request.contactNumber}-${Date.now()}`,
          campaignNumberId: request.campaignNumberId || undefined,
          contactId: request.contactId || undefined,
          contactName: request.contactName || undefined,
          contactPhone: request.contactNumber || undefined,
          serviceDetail: {
            name: request.campaignName || '',
            type: request.campaignType || '',
            uuid: request.campaignId || '',
          },
          ...(selected
            ? {
                disposition: {
                  _id: String(selected._id || ''),
                  disposition: selected.name,
                  name: userName || extension,
                  extension,
                  uuid: String(user?.uuid || ''),
                  createdAt: new Date().toISOString(),
                },
              }
            : {}),
          ...(trimmedNote
            ? {
                note: {
                  note: trimmedNote,
                  name: userName || extension,
                  extension,
                  source: 'LEAD',
                  user_uuid: String(user?.uuid || ''),
                  createdAt: new Date().toISOString(),
                },
              }
            : {}),
        });
      } catch {
        setIsSaving(false);
        handleAlert({
          text: 'Could not save the reason. The lead has not been skipped.',
          type: 'error',
        });
        return;
      }
    }

    request.onConfirm({
      dispositionId: selected?._id || '',
      dispositionName: selected?.name || '',
      note: trimmedNote,
    });
    setIsSaving(false);
    close();
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col p-3 sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#17385e]">Why are you skipping this lead?</p>
          <p className="mt-0.5 truncate text-[12px] text-[#5d7394]">
            {request.contactName}
            {request.contactNumber ? ` · ${request.contactNumber}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Cancel skip"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#2f4d75] transition hover:bg-[#edf3ff] hover:text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {hasReasons ? (
          <>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5d7394]">
              Skip reason
            </p>
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {request.reasons.map((reason) => {
                const isSelected = selectedId === reason._id;
                return (
                  <button
                    key={reason._id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={isSaving}
                    onClick={() => {
                      setSelectedId(isSelected ? '' : reason._id);
                      setDispositionId('');
                    }}
                    className={
                      isSelected
                        ? 'rounded-xl border border-primary bg-primary px-3 py-2.5 text-left text-[12.5px] font-semibold text-white disabled:opacity-60'
                        : 'rounded-xl border border-ucass-active-bg bg-white px-3 py-2.5 text-left text-[12.5px] font-medium text-[#23456f] transition hover:bg-[#f2f7ff] disabled:opacity-60'
                    }
                  >
                    {reason.name}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mb-4 rounded-xl border border-[#ffe2bd] bg-[#fff9f0] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#8a5300]">
            This campaign has no skip reasons set up, so there is nothing to choose from. An admin
            can tick <span className="font-semibold">Skip reason</span> against a disposition in the
            campaign&apos;s Calling rules step. You can still leave a note and pick a
            disposition below.
          </div>
        )}

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5d7394]">
          Reason / description
        </p>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 500))}
          rows={5}
          maxLength={500}
          disabled={isSaving}
          placeholder="What happened? e.g. wrong person, asked to be called after 6pm"
          className="w-full resize-none rounded-xl border border-[#dbe4f3] bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-[#23456f] outline-none placeholder:text-[#93a3ba] focus:border-[#9fc0ff] disabled:opacity-60"
        />
        <p className="mt-1 text-right text-[10.5px] text-[#8494ab]">{note.length}/500</p>

        {dispositionOptions.length ? (
          <div className="mt-5 border-t border-ucass-active-bg pt-4">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold text-[#17385e]">Agent disposition</p>
              <p className="text-[11px] text-[#5d7394]">Optional · one only</p>
            </div>
            <p className="mb-3 text-[11.5px] leading-relaxed text-[#5d7394]">
              Switch one on to record how this lead ended, even though you are not calling it.
              {campaignDispositions.length
                ? ''
                : ' This campaign has none switched on, so these are your company\u2019s agent dispositions.'}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {dispositionOptions.map((option) => {
                const isOn = dispositionId === option._id;
                return (
                  <div
                    key={option._id}
                    className={
                      isOn
                        ? 'flex min-h-[52px] items-center gap-3 rounded-xl border border-primary bg-[#f2f7ff] px-3 py-2'
                        : 'flex min-h-[52px] items-center gap-3 rounded-xl border border-ucass-active-bg bg-white px-3 py-2'
                    }
                  >
                    <Switch
                      id={`skip-disposition-${option._id}`}
                      checked={isOn}
                      disabled={isSaving}
                      onCheckedChange={(checked: boolean) => {
                        setDispositionId(checked ? option._id : '');
                        if (checked) setSelectedId('');
                      }}
                    />
                    <label
                      htmlFor={`skip-disposition-${option._id}`}
                      className="cursor-pointer text-[12.5px] font-semibold text-[#23456f]"
                    >
                      {option.name}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-ucass-active-bg pt-3">
        <button
          type="button"
          onClick={close}
          disabled={isSaving}
          className="rounded-lg border border-ucass-active-bg px-3 py-2 text-[12.5px] font-medium text-[#2f4d75] transition hover:bg-[#f2f7ff] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-white transition disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <SkipForward className="h-3.5 w-3.5" />
          )}
          {isSaving ? 'Saving' : 'Skip lead'}
        </button>
      </div>
    </div>
  );
};

export default DialpadCampaignSkipPanel;
