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

const ReadOnly = ({ label, value, note }: { label: string; value?: string; note?: string }) => (
  <Field label={label} note={note} aside={<span className="mcm-lock">Read only</span>}>
    <Input placeholder="—" disabled value={value || ''} readOnly />
  </Field>
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
    <div className="flex flex-col pr-1 pt-1">
      <section className="mcm-fsec">
        <div className="mcm-fsec-h">
          <div className="mcm-fsec-t">Identity</div>
          <div className="mcm-fsec-d">
            Your name as it shows across the console, the directory and on caller ID.
          </div>
        </div>
        <div className="mcm-fgrid">
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
            {/* The counter is the only warning a person gets before the limit
                stops their typing; without it the field just goes quiet. */}
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
        </div>
      </section>

      <section className="mcm-fsec">
        <div className="mcm-fsec-h">
          <div className="mcm-fsec-t">About you</div>
          <div className="mcm-fsec-d">
            How you would like to be referred to, and the language you would like the console in.
          </div>
        </div>
        {aboutLocked ? (
          <span className="mcm-setrow-note">
            Pronouns and language are not saved on this server yet. Your name and job title still
            save as before.
          </span>
        ) : null}
        <div className="mcm-fgrid">
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
          <div className="mcm-fitem">
            <div className="mcm-field-h">
              <Label>Interface language</Label>
              {HAS_TRANSLATIONS ? null : <NotAppliedFlag>Coming soon</NotAppliedFlag>}
            </div>
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
            {/* One language today means nothing to choose. The choice is
                still saved so it is there when translations arrive - said
                plainly rather than dressed up as a working setting. */}
            <span className="mcm-field-note">
              {HAS_TRANSLATIONS
                ? 'The console switches to this language after you save.'
                : 'The console is in English today. Your choice is saved for when more languages are ready.'}
            </span>
          </div>
        </div>
      </section>

      <section className="mcm-fsec">
        <div className="mcm-fsec-h">
          <div className="mcm-fsec-t">Workplace</div>
          <div className="mcm-fsec-d">
            Your location and extension are set by an administrator under People.
          </div>
        </div>
        <div className="mcm-fgrid">
          <ReadOnly label="Location" value={watch('basic.site')?.label} />
          <ReadOnly
            label="Extension"
            value={watch('basic.extension') ? String(watch('basic.extension')) : ''}
            note="Set when your account was created."
          />
        </div>
      </section>

      <section className="mcm-fsec">
        <div className="mcm-fsec-h">
          <div className="mcm-fsec-t">Contact</div>
          <div className="mcm-fsec-d">
            How the company reaches you. Ask an administrator to change either of these.
          </div>
        </div>
        <div className="mcm-fgrid">
          <ReadOnly label="Phone" value={watch('basic.phone')} />
          <ReadOnly label="Email" value={watch('basic.email')} note="Also the sign-in address." />
        </div>
      </section>
    </div>
  );
};

export default ProfileForm;
