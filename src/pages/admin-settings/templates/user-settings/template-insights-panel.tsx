/* A glance at how the template list is shaped — usage over time, which
 * settings templates most often switch on, and how many are active versus
 * archived. Demo-only: none of these numbers are real (see
 * dummy-template-meta.ts for why — nothing in this codebase counts how many
 * profiles a template is actually applied to). Only ever rendered from
 * index.tsx when isDemoMode() is true, and never mixed into the real table
 * next to it.
 */

import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { COMPANY_DEFAULT_TEMPLATE_NAME } from '@/lib/company-defaults';
import Loader from '@/components/custom/loader';
import {
  buildDummyFrequentFields,
  buildDummyUsageSeries,
  getDummyTemplateMeta,
  getDummyTemplateStatus,
  getStatusColours,
} from './dummy-template-meta';

const ACCENT = '#ea6b42';
const ACCENT_SOFT = '#f2c9a8';

const PanelCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-[#f0d6b4] bg-white/60 backdrop-blur-md p-3">
    <p className="mb-2 text-xs font-semibold text-[#b5502f]">{title}</p>
    {children}
  </div>
);

const TemplateInsightsPanel = ({
  templates,
  loading,
}: {
  templates: any[];
  loading?: boolean;
}) => {
  const realTemplates = (templates || []).filter(
    (template) => template?.name !== COMPANY_DEFAULT_TEMPLATE_NAME,
  );

  if (loading) {
    return (
      <div className="w-[280px] shrink-0 rounded-xl border border-[#f0d6b4] bg-white/40 p-4">
        <Loader />
      </div>
    );
  }

  if (realTemplates.length === 0) {
    return (
      <div className="w-[280px] shrink-0 rounded-xl border border-[#f0d6b4] bg-white/40 p-4 text-xs text-gray-500">
        Insights show up once there is at least one template.
      </div>
    );
  }

  const usageSeries = buildDummyUsageSeries(realTemplates);
  const frequentFields = buildDummyFrequentFields(realTemplates).slice(0, 5);
  const maxFieldCount = Math.max(...frequentFields.map((field) => field.count), 1);

  const statusCounts = realTemplates.reduce(
    (acc: Record<string, number>, template) => {
      const meta = getDummyTemplateMeta(template);
      const status = getDummyTemplateStatus(template?.uuid, meta.baseStatus);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {},
  );
  const statusData = (['Active', 'Pending', 'Draft', 'Archived'] as const)
    .map((status) => ({
      name: status,
      value: statusCounts[status] || 0,
      colour: getStatusColours(status).text,
    }))
    .filter((slice) => slice.value > 0);

  return (
    <div className="w-[280px] shrink-0 h-full overflow-y-auto flex flex-col gap-3 pr-1">
      <p className="text-xs font-semibold text-gray-500">
        Demo numbers — not counted from real usage yet.
      </p>

      <PanelCard title="Template usage">
        <div className="h-[110px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={usageSeries} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="templateUsageFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9A948F' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: '#f0d6b4' }}
                formatter={(value) => [`${value} profiles`, 'Updated via a template']}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={ACCENT}
                strokeWidth={2}
                fill="url(#templateUsageFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </PanelCard>

      <PanelCard title="Frequent fields">
        <div className="flex flex-col gap-2">
          {frequentFields.map((field) => (
            <div key={field.label} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate text-[11px] text-gray-600">{field.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full border border-[#f0d6b4] bg-[#fdeee0]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(8, (field.count / maxFieldCount) * 100)}%`,
                    backgroundColor: ACCENT_SOFT,
                  }}
                />
              </div>
              <span className="w-4 shrink-0 text-right text-[11px] text-gray-500">{field.count}</span>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="Template status">
        <div className="flex items-center gap-3">
          <div className="h-[90px] w-[90px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" innerRadius={26} outerRadius={40} paddingAngle={2}>
                  {statusData.map((slice) => (
                    <Cell key={slice.name} fill={slice.colour} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: '#f0d6b4' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1">
            {statusData.map((slice) => (
              <div key={slice.name} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.colour }}
                />
                {slice.name} ({slice.value})
              </div>
            ))}
          </div>
        </div>
      </PanelCard>
    </div>
  );
};

export default TemplateInsightsPanel;
