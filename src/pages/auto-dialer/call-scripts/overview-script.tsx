import SideDrawer from '@/components/custom/side-drawer';
import ScriptPagesViewer from '@/components/custom/script-pages-viewer';
import { sampleScriptValues } from '@/lib/script-variables';
import { pagesOf } from '@/lib/script-pages';
import { useMemo, useState } from 'react';

/* Preview: a script read the way the agent's panel shows it, page by page,
   with sample details where a live call fills in the caller, the agent and
   the company. The disposition box lets an admin walk a branch that only
   opens after a call is labelled. */
const OverviewScript = ({ modalState, setModalState }: { modalState: any; setModalState: any }) => {
  const row = modalState?.selectedCampaign;
  const pages = useMemo(() => pagesOf(row), [row]);
  const [disposition, setDisposition] = useState('');
  return (
    <SideDrawer
      isOpen={modalState?.isModalOpen}
      width="min(520px, 96vw)"
      title={`Preview (${row?.name || 'Script'})`}
      isHeader={true}
      handleClose={() => setModalState({ isModalOpen: false, selectedCampaign: null })}
      content={
        <div className="flex h-full min-h-0 flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              Sample details stand in for the real caller, agent and company.
            </p>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              Pretend the disposition is
              <input
                value={disposition}
                onChange={(event) => setDisposition(event.target.value)}
                placeholder="e.g. Callback"
                className="w-32 rounded-lg border border-gray-200 px-2 py-1"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1">
            <ScriptPagesViewer
              pages={pages}
              values={sampleScriptValues()}
              disposition={disposition}
              resetKey={String(row?._id || '')}
            />
          </div>
        </div>
      }
    />
  );
};

export default OverviewScript;
