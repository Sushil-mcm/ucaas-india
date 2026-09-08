import CustomTooltip from '@/components/custom/custom-tooltip';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Bot, Headphones, Info, UserCheck, Workflow, X } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

function getContextPathValueLabel(value: any): string {
  if (value === null || value === undefined) return '';

  if (['string', 'number', 'boolean'].includes(typeof value)) {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return getContextPathValues(value).join(' -> ');
  }

  const displayValue =
    value?.label ??
    value?.name ??
    value?.context ??
    value?.current_context ??
    value?.value ??
    value?.type ??
    value?.id;

  if (displayValue !== null && displayValue !== undefined && typeof displayValue !== 'object') {
    return String(displayValue).trim();
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

export function getContextPathValues(contextPath: any): string[] {
  if (contextPath === null || contextPath === undefined || contextPath === '') return [];

  if (Array.isArray(contextPath)) {
    return contextPath.map(getContextPathValueLabel).filter(Boolean);
  }

  if (typeof contextPath === 'string') {
    const trimmedContextPath = contextPath.trim();
    if (!trimmedContextPath) return [];

    try {
      const parsedContextPath = JSON.parse(trimmedContextPath);
      return getContextPathValues(parsedContextPath);
    } catch {
      return trimmedContextPath
        .split(/\s*(?:->|,|\|)\s*/)
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }

  if (typeof contextPath === 'object') {
    return Object.values(contextPath).map(getContextPathValueLabel).filter(Boolean);
  }

  return [String(contextPath).trim()].filter(Boolean);
}

type CallPathCellProps = {
  call: any;
  onOpen: (call: any) => void;
  secondary?: ReactNode;
};

const getCampaignCallPathLabel = (call: any) => {
  const campaignLabel =
    `${call?.campaign_name || ''}${call?.campaign_type ? ` (${call?.campaign_type})` : ''}`.trim();

  return campaignLabel || null;
};

export const CallPathCell = ({ call, onOpen, secondary }: CallPathCellProps) => {
  const secondaryContent = secondary ?? getCampaignCallPathLabel(call);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {/* Empty, not a dash. A cell with no context has nothing to say;
            '---' reads as a value that failed to load. The info button
            beside it still opens the full path. */}
        <div className="capitalize">{call?.current_context || ''}</div>
        {call ? (
          <CustomTooltip text="View call path" side="top">
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-primary"
              aria-label="View call path"
              onClick={(event) => {
                event.stopPropagation();
                onOpen(call);
              }}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </CustomTooltip>
        ) : null}
      </div>
      {secondaryContent ? <div>{secondaryContent}</div> : null}
    </div>
  );
};

type CallPathDialogProps = {
  call: any;
  onClose: () => void;
};

type CallPathStep = {
  kind: string;
  value: string;
};

/* Each raw value is usually "Label: Value" ("IVR: Main Menu", "Queue:
   Support", "Agent: Priya Sharma") but isn't guaranteed to be — a step with
   no colon just has no label, and renders with the generic node icon. */
const parseCallPathStep = (raw: string): CallPathStep => {
  const separatorIndex = raw.indexOf(':');
  if (separatorIndex === -1) return { kind: '', value: raw };
  return {
    kind: raw.slice(0, separatorIndex).trim(),
    value: raw.slice(separatorIndex + 1).trim(),
  };
};

const getCallPathStepIcon = (kind: string): ComponentType<{ className?: string }> => {
  const normalized = kind.toLowerCase();
  if (normalized.includes('ivr')) return Bot;
  if (normalized.includes('queue')) return Headphones;
  if (normalized.includes('agent')) return UserCheck;
  return Workflow;
};

export const CallPathDialog = ({ call, onClose }: CallPathDialogProps) => {
  const steps = getContextPathValues(call?.context_path).map(parseCallPathStep);

  return (
    <Dialog
      open={Boolean(call)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="cpd-modal max-w-sm w-full rounded-[20px] p-4.5 gap-0 bg-[#fffdfb] border border-[rgba(249,115,22,0.18)] shadow-[0_20px_45px_rgba(160,95,30,0.20)] backdrop-blur-[20px]"
        overlayClassName="bg-black/35 backdrop-blur-sm"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Call Routing Path</DialogTitle>
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-[#1a1a1a]">
            <Workflow className="h-4.5 w-4.5 text-[#ea580c]" />
            Call Routing Path
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[rgba(249,115,22,0.2)] bg-[#fff7ed] text-[#8a6f57] transition-all hover:bg-[#ffedd5] hover:text-[#1a1a1a]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-sm text-[#64748b]">
          Queue: <span className="font-medium capitalize text-[#1a1a1a]">{call?.current_context || '---'}</span>
        </p>

        {steps.length ? (
          /* Enterprise call paths can run 4-6+ hops (IVR -> Language ->
             Queue -> Transfer -> Agent); a scroll cap keeps a long path from
             pushing the modal itself past the viewport instead of just
             scrolling internally. */
          <div className="flex max-h-[55vh] flex-col overflow-y-auto pr-1">
            {steps.map((step, index) => {
              const StepIcon = getCallPathStepIcon(step.kind);
              const isAgent = step.kind.toLowerCase().includes('agent');
              const isLast = index === steps.length - 1;
              return (
                <div key={`${step.kind}-${step.value}-${index}`} className="flex flex-col">
                  <div
                    className={`flex items-center gap-2.5 rounded-full border px-3 py-1.5 ${
                      isAgent
                        ? 'border-emerald-200 bg-emerald-50/80'
                        : 'border-orange-100/70 bg-white/80'
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        isAgent ? 'bg-emerald-100 text-emerald-600' : 'bg-[#fff1eb] text-[#ea580c]'
                      }`}
                    >
                      <StepIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex min-w-0 items-baseline gap-1.5">
                      {step.kind && (
                        <span className="shrink-0 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          {step.kind}
                        </span>
                      )}
                      <span className="truncate text-xs font-semibold text-[#1a1a1a] capitalize">
                        {step.value}
                      </span>
                    </div>
                    {isAgent && (
                      <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  {!isLast && (
                    <div className="relative flex h-2 items-center justify-center">
                      <div className="absolute h-full w-px bg-[rgba(249,115,22,0.25)]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[rgba(249,115,22,0.25)] p-4 text-center text-sm text-[#64748b]">
            No context path available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
