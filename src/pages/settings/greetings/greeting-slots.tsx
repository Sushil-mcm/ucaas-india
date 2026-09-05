import { useRef } from 'react';
import { BellRing } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { Switch } from '@/components/ui/switch';
import SelectGreeting from '@/components/custom/greeting-select';
import { GreetingItem, useGetGreetings } from '@/hooks/common';
import { useIsStarterPlan } from '@/hooks/use-is-starter-plan';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';

/**
 * The four audio slots on My Account > Greetings.
 *
 * Why this is not `CommonGreetingNotification`: that component is shared by
 * five screens (number forwarding, call queues, IVR menus, campaigns and the
 * admin People drawer), all of them drawers or tabs where a flat list of
 * "slot + switch + picker" rows is the right shape. This is a full page, and
 * it was showing the same four slots twice — once as summary tiles at the top
 * and again as rows underneath — because the summary had to exist separately
 * to say anything the flat list could not.
 *
 * One set of cards that each state their own outcome removes that duplication.
 * The shared component is untouched, so the other four screens keep what suits
 * them.
 *
 * The ordering is the point. The shared list runs in whatever order its caller
 * declares, which means nothing to anybody. These run in the order a caller
 * actually meets them — the greeting that answers, the music while they wait,
 * the message if nobody picks up — and the ring tone is pulled out of that
 * sequence entirely, because it is the one recording the caller never hears.
 */

type SlotKey = 'welcome_greeting' | 'on_hold_music' | 'voicemail' | 'ring_tone';

type Slot = {
  key: SlotKey;
  /** The name in `SelectGreeting`, which decides the library it offers. */
  pickerName: 'greeting' | 'voicemail';
  label: string;
  /** When in the call this is heard. Shown under the name. */
  moment: string;
  /** What happens when the slot is off, stated as an outcome. */
  fallback: string;
  /** Ring tone has no upload path in the shared component; keep that. */
  canUpload: boolean;
};

const CALLER_SLOTS: Slot[] = [
  {
    key: 'welcome_greeting',
    pickerName: 'greeting',
    label: 'Welcome',
    moment: 'The moment the call connects',
    fallback: 'Callers hear the account greeting',
    canUpload: true,
  },
  {
    key: 'on_hold_music',
    pickerName: 'greeting',
    label: 'Hold music',
    moment: 'While they wait for you',
    fallback: 'Callers hear the account hold music',
    canUpload: true,
  },
  {
    key: 'voicemail',
    pickerName: 'voicemail',
    label: 'Voicemail',
    moment: 'If nobody picks up',
    fallback: 'Callers hear the account voicemail message',
    canUpload: true,
  },
];

const DESK_SLOT: Slot = {
  key: 'ring_tone',
  pickerName: 'greeting',
  label: 'Ring tone',
  moment: 'At your desk, when a call comes in',
  fallback: 'You hear the account ring tone',
  canUpload: false,
};

const GreetingSlots = () => {
  const isStarterPlan = useIsStarterPlan();
  const { greetingList, voicemailList } = useGetGreetings();
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<any>();

  /* Uploading opens a dialog that refetches the greeting library on success.
     That refetch re-renders this tree, and without holding the form values
     across it an in-progress edit is lost — the same guard the shared
     component keeps, for the same reason. */
  const snapshotRef = useRef<any>(null);
  const preserve = () => {
    const current = watch('greetings');
    try {
      snapshotRef.current = JSON.parse(JSON.stringify(current));
    } catch {
      snapshotRef.current = current;
    }
  };
  const restore = () => {
    if (!snapshotRef.current) return;
    setValue('greetings', snapshotRef.current, { shouldDirty: true, shouldTouch: true });
    snapshotRef.current = null;
  };

  const optionsFor = (slot: Slot): ISELECTVALUE[] => {
    const list: GreetingItem[] = slot.pickerName === 'voicemail' ? voicemailList : greetingList;
    return (list || []).map((item) => ({
      label: item.name,
      value: item.filename,
      uuid: item.uuid,
    })) as ISELECTVALUE[];
  };

  const toggle = (slot: Slot, on: boolean) => {
    setValue(`greetings.${slot.key}.enabled`, on, { shouldDirty: true, shouldTouch: true });
    /* Turning a slot off clears its recording, which is what the shared
       component does and what the payload expects. */
    setValue(`greetings.${slot.key}.value`, { label: '', value: '' } as ISELECTVALUE, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const renderSlot = (slot: Slot, step?: number) => {
    const enabled = Boolean(watch(`greetings.${slot.key}.enabled`));
    const value = watch(`greetings.${slot.key}.value`) || null;
    const chosen = String(value?.label || '').trim();
    const error =
      (errors as any)?.greetings?.[slot.key]?.value?.value?.message ||
      (errors as any)?.greetings?.[slot.key]?.value?.message
        ? `${slot.label} is required`
        : '';

    /* Three states, said as an outcome rather than as a switch position:
       using your own recording, falling back to the account default, or
       switched on with nothing picked yet — which is the one that would
       otherwise look finished and is not. */
    const outcome = !enabled ? slot.fallback : chosen || 'Nothing picked yet';
    const outcomeState = !enabled ? 'is-default' : chosen ? 'is-custom' : 'is-unset';

    return (
      <article
        key={slot.key}
        className={`mcm-gslot${enabled ? ' is-on' : ''}${chosen ? ' is-custom' : ''}`}
      >
        <header className="mcm-gslot-h">
          {step ? (
            <span className="mcm-gslot-step" aria-hidden="true">
              {String(step).padStart(2, '0')}
            </span>
          ) : (
            /* Not a number, because this slot is not part of the caller's
               sequence — that contrast is the whole reason it sits under its
               own heading. It was an empty dashed box, which reads as a mark
               that failed to load rather than as a deliberate difference. A
               bell is the literal thing a ring tone is. */
            <span className="mcm-gslot-step is-desk" aria-hidden="true">
              <BellRing />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="mcm-gslot-t">
              <label htmlFor={`greeting-${slot.key}`}>{slot.label}</label>
            </h3>
            <p className="mcm-gslot-m">{slot.moment}</p>
          </div>
          <Switch
            id={`greeting-${slot.key}`}
            className="cursor-pointer"
            checked={enabled}
            onCheckedChange={(next) => toggle(slot, next)}
          />
        </header>

        <p className={`mcm-gslot-out ${outcomeState}`}>
          <span className="mcm-gslot-out-k">Plays</span>
          <span className="mcm-gslot-out-v">{outcome}</span>
        </p>

        {enabled && (
          <div className="mcm-gslot-pick">
            <SelectGreeting
              name={slot.pickerName}
              isShowUpload={slot.canUpload}
              onGreetingUploadStart={preserve}
              onGreetingUploadSuccess={restore}
              onChangeMedia={(next) =>
                setValue(`greetings.${slot.key}.value`, next as ISELECTVALUE, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              }
              options={optionsFor(slot)}
              value={value}
              errors={error}
            />
          </div>
        )}
      </article>
    );
  };

  const callerSlots = CALLER_SLOTS.filter((slot) => !isStarterPlan || slot.key !== 'on_hold_music');

  return (
    <>
      <section className="mcm-gsec">
        <div className="mcm-gsec-h">
          <h2>What callers hear</h2>
          <p>
            In the order they meet it, from the moment you answer to the message you leave them.
          </p>
        </div>
        <div className="mcm-gslots">
          {callerSlots.map((slot, index) => renderSlot(slot, index + 1))}
        </div>
      </section>

      <section className="mcm-gsec">
        <div className="mcm-gsec-h">
          <h2>What you hear</h2>
          <p>The one recording on this page a caller never hears.</p>
        </div>
        <div className="mcm-gslots is-single">{renderSlot(DESK_SLOT)}</div>
      </section>
    </>
  );
};

export default GreetingSlots;
