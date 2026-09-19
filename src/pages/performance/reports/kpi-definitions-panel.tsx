import { useMemo, useState } from 'react';

import { KPI_DEFINITIONS, KPI_DICTIONARY_CHANGELOG } from '@/lib/kpi-definitions';

/**
 * The published dictionary behind every number on the reporting screens.
 *
 * A report is only trustworthy when the reader can see what each figure
 * counts, what it leaves out and how it is computed. This panel is that
 * definition, in one place, with a dated change log - so when a definition
 * moves, the reader can see that it moved and when. The rows are generated
 * from the reporting reference (src/lib/kpi-definitions.ts); edit the source,
 * never this file, so the screen and the sheet cannot drift apart.
 */
const KpiDefinitionsPanel = () => {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return KPI_DEFINITIONS;
    return KPI_DEFINITIONS.filter((r) =>
      [r.item, r.what, r.formula, r.type].some((v) => v.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <div className="panel-card">
      <div className="pc-head">
        <h3>Definitions</h3>
        <span className="pc-right" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
          {KPI_DEFINITIONS.length} measures · what each one counts and how it is worked out
        </span>
      </div>
      <div className="pc-body">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a measure, e.g. abandon, wrap-up, service level"
          aria-label="Search definitions"
          style={{
            width: '100%',
            maxWidth: 420,
            marginBottom: 12,
            padding: '7px 10px',
            border: '1px solid var(--line, #d9dedd)',
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--ink-3)', fontSize: 11 }}>
                <th style={{ padding: '6px 8px', width: '18%' }}>Measure</th>
                <th style={{ padding: '6px 8px', width: '26%' }}>What it counts</th>
                <th style={{ padding: '6px 8px', width: '10%' }}>Kind</th>
                <th style={{ padding: '6px 8px' }}>How it is worked out</th>
                <th style={{ padding: '6px 8px', width: '16%' }}>Granularity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.item} style={{ borderTop: '1px solid var(--line, #e9eded)', verticalAlign: 'top' }}>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{r.item}</td>
                  <td style={{ padding: '8px' }}>{r.what}</td>
                  <td style={{ padding: '8px', color: 'var(--ink-3)' }}>{r.type}</td>
                  <td style={{ padding: '8px' }}>{r.formula}</td>
                  <td style={{ padding: '8px', color: 'var(--ink-3)' }}>{r.granularity}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 12, color: 'var(--ink-3)' }}>No measure matches that. Try a shorter word.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)' }}>
          <strong style={{ color: 'var(--ink-2)' }}>Change log</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {KPI_DICTIONARY_CHANGELOG.map((c) => (
              <li key={c.date}><span style={{ fontVariantNumeric: 'tabular-nums' }}>{c.date}</span> — {c.change}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default KpiDefinitionsPanel;
