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

interface SettingCardProps {
  title: string;
  description?: ReactNode;
  /* Shown at the top right - a switch that governs the whole group, or a badge. */
  aside?: ReactNode;
  /* Optional mark in the header. The company screens use one per area. */
  icon?: ReactNode;
  /* Whether the settings in this card actually change what happens on a call.
     Left undefined, no claim is made either way - which is right for a card
     whose settings have always worked. Passing false says plainly that they are
     stored and not yet acted on, and `enforcementNote` says what is missing. */
  enforced?: boolean;
  enforcementNote?: ReactNode;
  children: ReactNode;
}

export const SettingCard = ({
  title,
  description,
  aside,
  icon,
  enforced,
  enforcementNote,
  children,
}: SettingCardProps) => (
  <section className="mcm-setcard">
    <header className="mcm-setcard-h">
      {icon ? <span className="mcm-setcard-icon">{icon}</span> : null}
      <div className="mcm-setcard-ht">
        <div className="mcm-setcard-title">
          <h3>{title}</h3>
          {enforced === undefined ? null : (
            <span className={`mcm-setcard-badge${enforced ? ' is-on' : ''}`}>
              {enforced ? 'Active' : 'Not active yet'}
            </span>
          )}
        </div>
        {description ? <p>{description}</p> : null}
      </div>
      {aside ? <div className="mcm-setcard-aside">{aside}</div> : null}
    </header>
    <div className="mcm-setcard-body">{children}</div>
    {/* Kept at the foot rather than the header: what is missing matters after
        somebody has read the settings, not before. */}
    {enforced === false && enforcementNote ? (
      <p className="mcm-setcard-note">{enforcementNote}</p>
    ) : null}
  </section>
);

interface SettingRowProps {
  label: string;
  /* What this does, in a sentence, for someone who has not seen it before. */
  description?: ReactNode;
  /* The input, select or switch. Sits right on wide screens, below on narrow. */
  control?: ReactNode;
  /* A control that needs the full width - a list, a picker - goes here instead. */
  children?: ReactNode;
  /* Marks a row whose effect is not yet live, so nobody is misled by it. */
  notActive?: boolean;
}

export const SettingRow = ({
  label,
  description,
  control,
  children,
  notActive,
}: SettingRowProps) => (
  <div className={`mcm-setrow${children ? ' mcm-setrow-stack' : ''}`}>
    <div className="mcm-setrow-t">
      <span className="mcm-setrow-label">
        {label}
        {notActive ? <span className="mcm-setrow-flag">Not active yet</span> : null}
      </span>
      {description ? <p className="mcm-setrow-desc">{description}</p> : null}
    </div>
    {control ? <div className="mcm-setrow-c">{control}</div> : null}
    {children ? <div className="mcm-setrow-full">{children}</div> : null}
  </div>
);

/* Sub-settings belonging to the row above. Rendering nothing when the parent is
   off is deliberate: a disabled field still reads as something you could change,
   and an admin should not have to work out which half of a screen applies. */
export const SettingNest = ({ when, children }: { when: boolean; children: ReactNode }) =>
  when ? <div className="mcm-setnest">{children}</div> : null;

export const SettingGrid = ({ children }: { children: ReactNode }) => (
  <div className="mcm-setgrid">{children}</div>
);
