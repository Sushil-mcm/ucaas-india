/* The fields on your own Profile page.
 *
 * This used to reuse the admin "Basic Information" step from the People
 * editor. That step is written for an admin editing somebody else: it lets a
 * job title run to 80 characters when the column holds 30 (so a long title
 * failed the whole save, name and photo included), it fetches the site list
 * for a select that is locked on this page, and it talks about "the user".
 *
 * A person's own page needs less and says it differently, so it has its own
 * form. Only first name, last name and job title are editable; the rest is
 * shown so the person can check it, and says who to ask.
 *
 * The form fields and their names are unchanged (`basic.first_name` and so
 * on), so the page's schema and payload builder read exactly what they did.
 */

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { Label } from '@/components/ui/label';
import CustomSelect from '@/components/custom/custom-select';
import { NotAppliedFlag } from '@/pages/settings/not-applied-note';
import { useFormContext } from 'react-hook-form';
import {
  HAS_TRANSLATIONS,
  INTERFACE_LANGUAGES,
  PRONOUNS_MAX,
  PRONOUNS_PLACEHOLDER,
  languageOption,
} from './interface-languages';

/* `users.job_title` is varchar(30). The database is strict, so a longer title
   rejects the whole row rather than trimming it. */
export const JOB_TITLE_MAX = 30;

/* Every field on this page is built from this, so each one is the same three
   parts in the same order: a label row, the control, an optional note.
 
   The editable fields used to hand their label to `Input`, which renders it
   inside its own wrapper, while the read-only ones rendered a label beside a
   "Read only" chip and then the control. Two structures in one grid meant two
   different heights above the box, so a pair on the same row did not line up.
   The error is shown here too, for the same reason: passing it to `Input`
   makes it draw a header row of its own. */
const Field = ({
  label,
  note,
  error,
  aside,
  children,
}: {
  label: string;
  note?: ReactNode;
  error?: string;
  aside?: ReactNode;
  children: ReactNode;
}) => (
  <div className="mcm-fitem">
    <div className="mcm-field-h">
      <Label>{label}</Label>
      {error ? <ErrorTooltip text={error} /> : aside}
    </div>
    {children}
    {note ? (
      <span className="mcm-field-note" aria-live="polite">
        {note}
      </span>
    ) : null}
  </div>
);

/* Red edge without handing the message to `Input`, which would add a second
   label row above the one `Field` has already drawn. */
const errorEdge = (error?: string) => (error ? 'border-red-500 focus:border-red-500' : '');

/* A value somebody else owns, shown as a value. It used to be a disabled
   `Input` with a "Read only" chip: a box shaped exactly like the ones above
   it that you cannot type into, needing a chip to explain the difference.
   Read as a fact it explains itself, and the card is half the height. */
const Fact = ({ label, value, note }: { label: string; value?: string; note?: string }) => (
  <div className="min-w-0">
    <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#9A948F]">{label}</dt>
    <dd className="mt-1 truncate text-sm font-medium text-[#2E2D35]" title={value || undefined}>
      {value || '—'}
    </dd>
    {note ? <p className="mt-0.5 text-xs text-[#9A948F]">{note}</p> : null}
  </div>
);

/* `selfProfile` says whether this server can save pronouns and language:
   null while the page is still asking, false on a server without the
   /api/profile/update-self endpoint, true when it is there. The two fields
   are shown either way so a person can see what the page holds, and are
   locked with a note when the save cannot reach them. */
const ProfileForm = ({ selfProfile = null }: { selfProfile?: boolean | null }) => {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext();

  const jobTitle = String(watch('basic.job_title') || '');
  const pronouns = String(watch('basic.pronouns') || '');
  const fieldErrors = (errors.basic as any) || {};
  const aboutLocked = selfProfile === false;

  return (
    <div className="flex flex-col gap-4 pr-1 pt-1">
      {/* Two cards, split by who may change what, rather than four alike.
          Identity, About, Workplace and Contact were four bordered sections of
          the same weight, so nothing on the page said that the first two are
          yours and the last two are an administrator's. */}
      <section className="mcm-solid-card rounded-2xl border border-[#EEE7DD] bg-white p-5">
        <header className="border-b border-[#EEE7DD] pb-3">
          <h3 className="text-sm font-bold text-[#2E2D35]">Your details</h3>
          <p className="mt-0.5 text-xs leading-5 text-[#9A948F]">
            How you appear across the console, the directory and on caller ID. These are yours to
            change.
          </p>
        </header>

        <div className="mcm-fgrid mt-4">
          <Field label="First Name" error={fieldErrors?.first_name?.message}>
            <Input
              placeholder="Enter first name"
              className={errorEdge(fieldErrors?.first_name?.message)}
              {...register('basic.first_name')}
              maxLength={50}
            />
          </Field>
          <Field label="Last Name" error={fieldErrors?.last_name?.message}>
            <Input
              placeholder="Enter last name"
              className={errorEdge(fieldErrors?.last_name?.message)}
              {...register('basic.last_name')}
              maxLength={50}
            />
          </Field>
          <div className="wide">
            <Field
              label="Job Title"
              error={fieldErrors?.job_title?.message}
              note={`${jobTitle.length}/${JOB_TITLE_MAX} characters`}
            >
              <Input
                placeholder="e.g. Support Team Lead"
                className={errorEdge(fieldErrors?.job_title?.message)}
                {...register('basic.job_title')}
                maxLength={JOB_TITLE_MAX}
              />
            </Field>
          </div>

          <Field
            label="Pronouns"
            error={fieldErrors?.pronouns?.message}
            note={`Optional. Shown next to your name where colleagues see it. ${pronouns.length}/${PRONOUNS_MAX} characters`}
          >
            <Input
              placeholder={PRONOUNS_PLACEHOLDER}
              className={errorEdge(fieldErrors?.pronouns?.message)}
              {...register('basic.pronouns')}
              maxLength={PRONOUNS_MAX}
              disabled={aboutLocked}
            />
          </Field>
          <Field
            label="Interface language"
            aside={HAS_TRANSLATIONS ? null : <NotAppliedFlag>Coming soon</NotAppliedFlag>}
            note={
              HAS_TRANSLATIONS
                ? 'The console switches to this language after you save.'
                : 'The console is in English today. Your choice is saved for when more languages are ready.'
            }
          >
            <CustomSelect
              options={INTERFACE_LANGUAGES.map((l) => ({ label: l.label, value: l.value }))}
              value={languageOption(watch('basic.interface_language'))}
              handleChange={(option: { value?: string } | null) =>
                setValue('basic.interface_language', option?.value || INTERFACE_LANGUAGES[0].value, {
                  shouldDirty: true,
                })
              }
              isDisabled={aboutLocked}
            />
          </Field>
        </div>

        {aboutLocked ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Pronouns and language are not saved on this server yet. Your name and job title still
            save as before.
          </p>
        ) : null}
      </section>

      {/* Facts, not fields. These were four disabled inputs, which look like
          something you could type in and cannot — the lock chip beside each one
          was the only thing saying otherwise. Read as values, they need no
          chip and take half the height. */}
      <section className="mcm-solid-card rounded-2xl border border-[#EEE7DD] bg-white p-5">
        <header className="border-b border-[#EEE7DD] pb-3">
          <h3 className="text-sm font-bold text-[#2E2D35]">Set by your administrator</h3>
          <p className="mt-0.5 text-xs leading-5 text-[#9A948F]">
            Where you sit and how the company reaches you. Ask an administrator under People to
            change any of these.
          </p>
        </header>

        <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Fact label="Location" value={watch('basic.site')?.label} />
          <Fact
            label="Extension"
            value={watch('basic.extension') ? String(watch('basic.extension')) : ''}
            note="Set when your account was created."
          />
          <Fact label="Phone" value={watch('basic.phone')} />
          <Fact label="Email" value={watch('basic.email')} note="Also the sign-in address." />
        </dl>
      </section>
    </div>
  );
};

export default ProfileForm;
