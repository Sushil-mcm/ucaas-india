import { Ic, type McmIconName } from '@/components/mcm/icons';
import AlertConfirm from '@/components/custom/alert-confirm';
import { campaignPreflight, type PreflightState } from '@/lib/campaign-preflight';
import { DIAL_METHOD_LABEL } from './campaign-ui';

/**
 * What pressing Start is about to do, said before it is done.
 *
 * The campaign list is where somebody starts a campaign and it is also where
 * they stand watching it afterwards, so this panel deliberately does NOT take
 * them anywhere: it says its piece, they confirm, and the row goes green under
 * their cursor. Starting several campaigns in a row stays one click each.
 *
 * A blocked check never disables the button. An administrator is allowed to
 * start a campaign that cannot dial yet - queueing one up before the agents
 * arrive is ordinary - so the panel informs and the button reads "Start
 * anyway". What it must never do again is stay silent.
 */

const TONE: Record<PreflightState, { colour: string; icon: McmIconName; label: string }> = {
  ok: { colour: '#067647', icon: 'check', label: 'Ready' },
  warn: { colour: '#b54708', icon: 'alert', label: 'Worth knowing' },
  blocked: { colour: '#b42318', icon: 'alert', label: 'Will stop calls' },
  unknown: { colour: '#667085', icon: 'clock', label: 'Not known yet' },
};

type Props = {
  campaign: any;
  board: any;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

const StartPreflight = ({ campaign, board, open, onCancel, onConfirm, loading }: Props) => {
  if (!campaign) return null;
  const preflight = campaignPreflight({ campaign, board });
  const headlineColour =
    preflight.tone === 'crit' ? '#b42318' : preflight.tone === 'warn' ? '#b54708' : '#067647';
  const modeLabel =
    DIAL_METHOD_LABEL?.[preflight.mode as keyof typeof DIAL_METHOD_LABEL] || preflight.mode;

  return (
    <AlertConfirm
      open={open}
      setOpen={(next: boolean) => {
        if (!next) onCancel();
      }}
      onClose={onCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
      apiLoading={loading}
      className="w-full sm:w-[32rem] md:w-[34rem]"
      headerText={`Start ${campaign?.name || 'campaign'}?`}
      closeBtnText="Cancel"
      confirmBtnText={preflight.confirmLabel}
      descriptionTextComp={
        /* The dialog portals to <body>, outside the campaign area root, so the
           polish sheet scopes it by this dialog's own class instead. */
        <div className="mcm-cmp-preflight cmp-preflight flex flex-col gap-3 text-left">
          {/* The verdict first, in one sentence, in the colour of its severity. */}
          <div
            className={`cmp-preflight-verdict is-${preflight.tone} flex items-start gap-2 rounded-md p-2.5`}
            style={{ background: preflight.tone === 'good' ? '#f6fef9' : '#fffaf5' }}
          >
            <span
              className="cmp-preflight-ic"
              style={{ color: headlineColour, flexShrink: 0, marginTop: 1 }}
            >
              <Ic n={preflight.tone === 'good' ? 'bolt' : 'alert'} size={15} />
            </span>
            <span
              className="cmp-preflight-headline text-sm font-medium"
              style={{ color: headlineColour }}
            >
              {preflight.headline}
            </span>
          </div>

          <div className="cmp-preflight-mode text-xs" style={{ color: '#667085' }}>
            {modeLabel} campaign
          </div>

          <div className="cmp-preflight-checks flex flex-col gap-2.5">
            {preflight.checks.map((check) => {
              const tone = TONE[check.state];
              return (
                <div
                  key={check.key}
                  className={`cmp-preflight-check is-${check.state} flex items-start gap-2`}
                >
                  <span
                    className="cmp-preflight-ic"
                    style={{ color: tone.colour, flexShrink: 0, marginTop: 2 }}
                  >
                    <Ic n={tone.icon} size={13} />
                  </span>
                  <div className="cmp-preflight-copy flex flex-col">
                    <span
                      className="cmp-preflight-label text-xs font-medium"
                      style={{ color: '#344054' }}
                    >
                      {check.label}
                    </span>
                    <span className="cmp-preflight-text text-xs" style={{ color: '#667085' }}>
                      {check.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      }
    />
  );
};

export default StartPreflight;
