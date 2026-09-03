/* The building blocks for a settings screen.
 *
 * Our settings tabs were built as bare bordered boxes with a small grey label
 * above each input. That reads as a form to fill in rather than a set of
 * decisions to make: nothing says what a setting is for, what turning it on
 * costs, or which settings belong together. Sub-settings sat visible and inert
 * whether or not the thing they belong to was switched on.
 *
 * These four pieces encode the pattern established phone systems use, and which
 * the admin home here already half-uses:
 *
 *   SettingCard   a titled group of related decisions, with a sentence saying
 *                 what the group is for
 *   SettingRow    one decision - what it is on the left, the control on the
 *                 right, and a plain sentence underneath saying what it does
 *   SettingNest   sub-settings that appear only once their parent is on, so a
 *                 screen shows what applies rather than everything at once
 *   SettingGrid   numbers that belong side by side
 *
 * They take their colours from the tokens in mcm-page.css, so they follow the
 * light and dark themes without knowing anything about either.
 *
 * The description is not decoration. If a row cannot be given one, that usually
 * means the setting has not been thought through - and an admin reading only the
 * label would have been guessing.
 */

import { ReactNode } from 'react';

import './mcm-page.css';

/* What a settings card or row is telling you about itself.
 *
 * There used to be one flag here, `enforced`, and everything that was not
 * enforced showed the same badge: "Not active yet". Four very different
 * situations ended up wearing those three words, and a customer reading them
 * could not tell whether they had forgotten to switch something on or whether
 * the software simply could not do it. That is the wrong question to leave
 * somebody with, so the four situations now have four separate names and their
 * own words:
 *
 *   'active'      It works. What the card says happens, happens.
 *   'app-only'    It works here, in this app - it hides or greys out what it
 *                 says it will. Nothing checks it again further down, so treat
 *                 it as tidying the screen rather than as a lock.
 *   'coming-soon' The software cannot do this yet. What you choose is saved and
 *                 waiting, and nothing acts on it.
 *   'off'         You have not switched it on. Nothing is wrong; there is
 *                 simply nothing to do until you do.
 *
 * Only 'coming-soon' is about us. The others are about you or about what the
 * setting honestly reaches. Pick the one that is true - a wrong badge here is
 * worse than none, because somebody believes it. */
export type SettingStatus = 'active' | 'app-only' | 'coming-soon' | 'off';

const STATUS_LABEL: Record<SettingStatus, string> = {
  active: 'Active',
  'app-only': 'In this app only',
  'coming-soon': 'Coming soon',
  off: 'Off',
};

/* Colour carries the same meaning as the words, so the shape of a screen can be
   read before any of it is. Green works, blue works but only here, amber is on
   its way, grey is waiting for you. */
const STATUS_CLASS: Record<SettingStatus, string> = {
  active: ' is-on',
  'app-only': ' is-app',
  'coming-soon': '',
  off: ' is-off',
};

/* The old `enforced` boolean, kept working while the screens move across. False
   used to mean "stored and nothing acts on it", which is what 'coming-soon'
   now says in words a customer can act on. */
const resolveStatus = (
  status: SettingStatus | undefined,
  enforced: boolean | undefined,
): SettingStatus | undefined => {
  if (status) return status;
  if (enforced === undefined) return undefined;
  return enforced ? 'active' : 'coming-soon';
};

interface SettingCardProps {
  title: string;
  description?: ReactNode;
  /* Shown at the top right - a switch that governs the whole group, or a badge. */
  aside?: ReactNode;
  /* Optional mark in the header. The company screens use one per area. */
  icon?: ReactNode;
  /* How far the settings in this card really go. Left undefined, no claim is
     made either way - which is right for a card that only explains something.
     See SettingStatus above for what each one promises. */
  status?: SettingStatus;
  /* The sentence under the card saying what that status means here. It is shown
     whether or not there is a badge, so a card can carry a plain explanation
     without claiming anything about itself. */
  note?: ReactNode;
  /* The older pair, still honoured so screens can move across one at a time.
     Prefer `status` and `note`: a boolean cannot tell "we have not built it"
     apart from "you have not switched it on", and that is the whole point. */
  enforced?: boolean;
  enforcementNote?: ReactNode;
  children: ReactNode;
}

export const SettingCard = ({
  title,
  description,
  aside,
  icon,
  status,
  note,
  enforced,
  enforcementNote,
  children,
}: SettingCardProps) => {
  const shown = resolveStatus(status, enforced);
  const footnote = note ?? enforcementNote;

  return (
    <section className="mcm-setcard">
      <header className="mcm-setcard-h">
        {icon ? <span className="mcm-setcard-icon">{icon}</span> : null}
        <div className="mcm-setcard-ht">
          <div className="mcm-setcard-title">
            <h3>{title}</h3>
            {shown ? (
              <span className={`mcm-setcard-badge${STATUS_CLASS[shown]}`}>
                {STATUS_LABEL[shown]}
              </span>
            ) : null}
          </div>
          {description ? <p>{description}</p> : null}
        </div>
        {aside ? <div className="mcm-setcard-aside">{aside}</div> : null}
      </header>
      <div className="mcm-setcard-body">{children}</div>
      {/* Kept at the foot rather than the header: what a badge means matters
          after somebody has read the settings, not before. */}
      {footnote ? (
        <p className={`mcm-setcard-note${shown ? STATUS_CLASS[shown] : ' is-plain'}`}>{footnote}</p>
      ) : null}
    </section>
  );
};

interface SettingRowProps {
  label: string;
  /* What this does, in a sentence, for someone who has not seen it before. */
  description?: ReactNode;
  /* The input, select or switch. Sits right on wide screens, below on narrow. */
  control?: ReactNode;
  /* A control that needs the full width - a list, a picker - goes here instead. */
  children?: ReactNode;
  /* How far this one row really goes. Same four words as the card badge, so a
     row and the card around it can never say different things. */
  status?: SettingStatus;
  /* The older flag, still honoured. It meant "stored and nothing acts on it",
     which is what 'coming-soon' now says out loud. */
  notActive?: boolean;
  /* Marks the field mandatory. Worth stating on the row rather than at each
     call site: an admin filling a long form should be able to see what they
     have to answer without submitting it to find out. Only set this where the
     field is *always* required - a rule that only applies once some other
     option is on is not something to mark unconditionally. */
  required?: boolean;
}

export const SettingRow = ({
  label,
  description,
  control,
  children,
  status,
  notActive,
  required,
}: SettingRowProps) => {
  const shown = resolveStatus(status, notActive === undefined ? undefined : !notActive);

  return (
    <div className={`mcm-setrow${children ? ' mcm-setrow-stack' : ''}`}>
      <div className="mcm-setrow-t">
        <span className="mcm-setrow-label">
          {label}
          {/* aria-hidden with visually hidden text beside it: a bare "*" is
              read out as "star", or skipped, depending on the screen reader. */}
          {required ? (
            <span className="mcm-setrow-required">
              <span aria-hidden="true">*</span>
              <span className="sr-only"> (required)</span>
            </span>
          ) : null}
          {/* A row that simply works needs no flag - the absence of one already
            says so, and a badge on every line would drown the ones that matter. */}
          {shown && shown !== 'active' ? (
            <span className={`mcm-setrow-flag${STATUS_CLASS[shown]}`}>{STATUS_LABEL[shown]}</span>
          ) : null}
        </span>
        {description ? <p className="mcm-setrow-desc">{description}</p> : null}
      </div>
      {control ? <div className="mcm-setrow-c">{control}</div> : null}
      {children ? <div className="mcm-setrow-full">{children}</div> : null}
    </div>
  );
};

/* Sub-settings belonging to the row above. Rendering nothing when the parent is
   off is deliberate: a disabled field still reads as something you could change,
   and an admin should not have to work out which half of a screen applies. */
/* The same badge, on its own, for controls that do not sit inside a card.
 *
 * Some screens were built before these cards existed and lay out their own
 * fields. One of them - the queue wrap-up rule - was stored and never acted on,
 * said so in a code comment, and said nothing at all on screen. A control that
 * cannot be honest because of where it happens to live is a gap in this
 * component, not in that screen, so the badge is exported rather than copied. */
export const SettingFlag = ({ status }: { status: SettingStatus }) =>
  status === 'active' ? null : (
    <span className={`mcm-setrow-flag${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
  );

export const SettingNest = ({ when, children }: { when: boolean; children: ReactNode }) =>
  when ? <div className="mcm-setnest">{children}</div> : null;

export const SettingGrid = ({ children }: { children: ReactNode }) => (
  <div className="mcm-setgrid">{children}</div>
);
