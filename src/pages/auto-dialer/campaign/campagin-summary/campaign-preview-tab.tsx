import { useState } from 'react';
import { useAgentDay } from '@/hooks/use-agent-day';
import { useCompanyTimeZone } from '@/hooks/use-company-time-zone';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import { clockText } from '@/lib/agent-day';
import { personName, truncationNote } from '@/lib/agent-day-rows';
import { todayIn } from '@/lib/company-time-zone';

/* Preview tab of the campaign summary: how the agents used their preview
   time on this campaign, per person and day. Counts come from the events the
   dialer sends as each lead is offered, skipped or dialled and as each
   wrap-up ends; talk time and connected calls from the campaign call log.
   Days are cut in the company's zone (hooks/use-company-time-zone). */

const daysAgo = (days: number, timeZone: string) => todayIn(timeZone, new Date(Date.now() - days * 86400000));

const CampaignPreviewTab = ({ campaignId }: { campaignId: string }) => {
  const zone = useCompanyTimeZone();
  const { users } = useUsersDirectory();
  const timezone = zone.timeZone;
  const [range, setRange] = useState<'today' | '7' | '30'>('7');
  const dateTo = todayIn(timezone);
  const dateFrom = range === 'today' ? dateTo : daysAgo(range === '7' ? 6 : 29, timezone);
  const { rows, isPending, isError, truncated, maxRows } = useAgentDay(
    'preview',
    { date_from: dateFrom, date_to: dateTo, timezone, campaign_id: campaignId },
    { enabled: Boolean(campaignId) },
  );
  const cut = truncationNote({ truncated, max_rows: maxRows });

  const sum = (key: string) => rows.reduce((total, row) => total + (Number(row?.[key]) || 0), 0);
  const previewed = sum('leads_previewed');
  const skipped = sum('skipped');
  const dialled = sum('dialled');
  const previewSeconds = sum('preview_seconds');
  const wrapupSeconds = sum('wrapup_seconds');
  const connected = sum('connected_calls');
  const talk = sum('talk_seconds');
  const aht = connected ? Math.round((talk + wrapupSeconds) / connected) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="kpis">
        {[
          ['Leads previewed', String(previewed), 'how many leads were shown to an agent'],
          ['Skipped', String(skipped), previewed ? `${Math.round((skipped / previewed) * 100)}% of previewed` : '—'],
          ['Preview time used', clockText(previewSeconds), dialled + skipped ? `avg ${clockText(Math.round(previewSeconds / (dialled + skipped)))} per lead` : '—'],
          ['Wrap-up used', clockText(wrapupSeconds), connected ? `avg ${clockText(Math.round(wrapupSeconds / connected))} per call` : '—'],
          ['AHT incl. wrap-up', clockText(aht), `${connected} connected call${connected === 1 ? '' : 's'}`],
        ].map(([label, value, detail]) => (
          <div className="kpi" key={label}>
            <div className="k">{label}</div>
            <div className="v num">{value}</div>
            <div className="d">{detail}</div>
          </div>
        ))}
      </div>
      <div className="panel-card">
        <div className="pc-head">
          <h3>Preview time by agent and day</h3>
          <div className="pc-right" style={{ display: 'flex', gap: 6 }}>
            {(['today', '7', '30'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`btn ${range === value ? 'primary' : 'ghost'} sm`}
                onClick={() => setRange(value)}
              >
                {value === 'today' ? 'Today' : `Last ${value} days`}
              </button>
            ))}
          </div>
        </div>
        {isPending ? (
          <div className="pc-body">Loading…</div>
        ) : isError ? (
          <div className="pc-body">The preview figures could not be loaded.</div>
        ) : rows.length ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th style={{ width: 110 }}>Date</th>
                  <th className="num">Previewed</th>
                  <th className="num">Skipped</th>
                  <th className="num">Dialled</th>
                  <th className="num">Preview time</th>
                  <th className="num">Avg preview</th>
                  <th className="num">Wrap-up</th>
                  <th className="num">Connected</th>
                  <th className="num">AHT incl. wrap-up</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={`${row.user_uuid}:${row.date}`}>
                    <td>
                      <strong>{personName(row, users)}</strong>
                    </td>
                    <td className="num">{row.date}</td>
                    <td className="num">{row.leads_previewed}</td>
                    <td className="num">{row.skipped}</td>
                    <td className="num">{row.dialled}</td>
                    <td className="num">{clockText(row.preview_seconds)}</td>
                    <td className="num">{clockText(row.avg_preview_s)}</td>
                    <td className="num">{clockText(row.wrapup_seconds)}</td>
                    <td className="num">{row.connected_calls}</td>
                    <td className="num">{clockText(row.aht_incl_wrapup_s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="pc-body">
            No preview activity in this range. Figures appear once agents preview leads on this campaign.
          </div>
        )}
        <div className="pc-body tight" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
          {zone.sentence} Preview and wrap-up seconds are what each agent's dialer reported; talk time and
          connected calls come from the campaign call log. AHT incl. wrap-up = (talk + wrap-up) ÷ connected calls.
          {cut ? ` ${cut}` : ''}
        </div>
      </div>
    </div>
  );
};

export default CampaignPreviewTab;
