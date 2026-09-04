import { useMemo, useState } from 'react';
import { useCompanyFeatures } from '@/hooks/rbac';
import { Ic } from '@/components/mcm/icons';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import '@/components/mcm/mcm-page.css';

/**
 * Billing ▸ Modules & access.
 *
 * Why a part of the product is not there.
 *
 * Whole areas are gated by the tenant's plan: the Campaign menu, for one, is
 * only rendered when `plan_features.campaign.IS_SHOW` is true, and every route
 * beneath it is guarded by the same flag — so a hidden module cannot even be
 * reached by typing the URL. Nothing in the product said so, which left people
 * hunting for screens that were never going to appear.
 *
 * Two different things can hide a module, and they are fixed in different
 * places, so they are reported separately rather than collapsed into one
 * "unavailable":
 *
 *   - not on the plan      -> the module was never bought or provisioned
 *   - your role cannot see -> it is on the plan, but this role lacks `view`
 *
 * The list unions the keys the API returns with a known catalogue, so a module
 * added server-side appears without a code change *and* a module the plan omits
 * entirely is still reported — the omitted one being, of course, exactly the one
 * someone is looking for.
 */

/** Readable names and where each module lives, for the keys we know. */
const KNOWN: Record<string, { label: string; where?: string }> = {
  campaign: { label: 'Campaigns & auto-dialer', where: 'Campaign in the top menu' },
  chat: { label: 'Chat & messaging', where: 'Inbox' },
  account_setting: { label: 'Users & account settings', where: 'Admin ▸ Users' },
  phone_system_action: { label: 'Phone system', where: 'Admin ▸ Phone System' },
  virtual_numbers: { label: 'Numbers', where: 'Admin ▸ Numbers' },
  reports: { label: 'Reports', where: 'Reports in the top menu' },
  monitoring_features: { label: 'Live monitoring', where: 'Performance' },
  meeting: { label: 'Meetings & video', where: 'Meetings' },
  integration: { label: 'Integrations', where: 'Admin ▸ Integration' },
  knowledge_base: { label: 'AI tools', where: 'Admin ▸ AI Tools' },
  compliance: { label: 'Compliance', where: 'Admin ▸ Compliance' },
  billing: { label: 'Billing', where: 'Admin ▸ Billing' },
};

/** "phone_system_action" -> "Phone system action" for keys we do not know yet. */
const humanise = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/\bAi\b/g, 'AI');

type Row = {
  key: string;
  label: string;
  where?: string;
  onPlan: boolean;
  canView: boolean;
  /* False when the account's plan does not mention this module at all, which
     reads differently from "present but switched off". */
  returnedByApi: boolean;
};

const BillingModules = () => {
  const { companyPlanFeatures, planFeatures, IS_ADMIN } = useCompanyFeatures();
  const [onlyMissing, setOnlyMissing] = useState(false);

  const rows: Row[] = useMemo(() => {
    const company = (companyPlanFeatures || {}) as Record<string, any>;
    const effective = (planFeatures || {}) as Record<string, any>;

    /* A module can be missing from `plan_features` altogether rather than
       present and switched off — and that is exactly the case someone opens
       this page to understand. Listing only the keys the API returned meant the
       module you were hunting for was the one guaranteed not to appear. The
       known catalogue is unioned in so an absent module is reported as absent,
       not omitted. */
    const keys = Array.from(
      new Set([
        ...Object.keys(company).filter((key) => company[key] && typeof company[key] === 'object'),
        ...Object.keys(KNOWN),
      ]),
    );

    return keys
      .map((key) => {
        const entry = company[key] || {};
        const returnedByApi = Boolean(company[key] && typeof company[key] === 'object');
        /* Some modules carry an explicit IS_SHOW; others are simply present or
           absent. Treating "no flag" as on avoids reporting a module as missing
           purely because it uses the older shape. */
        const onPlan = !returnedByApi ? false : 'IS_SHOW' in entry ? Boolean(entry.IS_SHOW) : true;
        /* Mirrors the menu exactly. `Boolean(undefined)` is false there, so an
           absent `action.view` hides the module — an earlier version of this
           page fell back to `onPlan` when the flag was missing and cheerfully
           reported "Yes" for a module the menu was hiding. A page that explains
           why something is invisible must not itself disagree with the code
           doing the hiding. */
        const canView = Boolean(effective?.[key]?.action?.view);

        return {
          key,
          label: KNOWN[key]?.label || humanise(key),
          where: KNOWN[key]?.where,
          onPlan,
          canView,
          returnedByApi,
        };
      })
      .sort((a, b) => {
        /* Problems first — this page is opened because something is missing. */
        const rank = (row: Row) => (!row.onPlan ? 0 : !row.canView ? 1 : 2);
        return rank(a) - rank(b) || a.label.localeCompare(b.label);
      });
  }, [companyPlanFeatures, planFeatures]);

  const missing = rows.filter((row) => !row.onPlan || !row.canView);
  const visible = onlyMissing ? missing : rows;

  return (
    <AdminPage
      hideHead
      section="Billing"
      title="Modules & access"
      description="Which parts of the product this account can use, and why anything missing is missing."
      filters={
        <>
          <label className="fchip">
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(event) => setOnlyMissing(event.target.checked)}
            />
            Only show what is unavailable
          </label>
          <span
            className={`fchip ${missing.length ? 'bad' : 'live'}`}
            style={{ marginLeft: 'auto' }}
          >
            <span className="num">{missing.length}</span> of {rows.length} unavailable
          </span>
        </>
      }
    >
      <table>
        <thead>
          <tr>
            <th>Module</th>
            <th>Where it appears</th>
            <th>On your plan</th>
            <th>Your role can see it</th>
            <th>In the menu?</th>
            <th>What to do</th>
          </tr>
        </thead>
        <tbody>
          {visible.length ? (
            visible.map((row) => (
              <tr key={row.key}>
                <td>
                  <span style={{ display: 'block', fontWeight: 700 }}>{row.label}</span>
                  <span className="num" style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                    {row.key}
                  </span>
                </td>
                <td>{row.where || <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                <td>
                  <span className={row.onPlan ? 'tag pos' : 'tag neg'}>
                    {row.onPlan
                      ? 'Included'
                      : row.returnedByApi
                        ? 'Switched off'
                        : 'Not provisioned'}
                  </span>
                </td>
                <td>
                  <span className={row.canView ? 'tag pos' : 'tag warn'}>
                    {row.canView ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <span className={row.onPlan && row.canView ? 'tag pos' : 'tag neg'}>
                    {row.onPlan && row.canView ? 'Shown' : 'Hidden'}
                  </span>
                </td>
                <td style={{ maxWidth: 340, fontSize: 12.5, color: 'var(--ink-3)' }}>
                  {!row.onPlan
                    ? row.returnedByApi
                      ? 'On the plan but switched off. The menu and every route beneath it stay hidden until it is turned on.'
                      : 'Not on this account at all — the plan does not mention it. It has to be provisioned before the menu can appear.'
                    : !row.canView
                      ? 'On the plan, but this role has no view permission. Fix it in Admin ▸ Users ▸ Roles.'
                      : 'Available.'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6}>
                <div className="empty">
                  <Ic n="check" size={28} />
                  <p>
                    {onlyMissing
                      ? 'Everything on this plan is available to you.'
                      : 'No plan modules were returned for this account.'}
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mcm-tblfoot">
        Read from <code>plan_features</code> on this account, evaluated the same way the menu
        evaluates it — a module needs <code>IS_SHOW</code> <em>and</em> <code>action.view</code>,
        and a missing permission counts as no. “In the menu?” is the bottom line: if it says Hidden,
        that module will not appear anywhere in the app.
        {IS_ADMIN
          ? ' Enabling a module is a provisioning change on the plan, not a setting on this screen.'
          : ' Only an admin can see the full plan; this list reflects your own role.'}
      </div>
    </AdminPage>
  );
};

export default BillingModules;
