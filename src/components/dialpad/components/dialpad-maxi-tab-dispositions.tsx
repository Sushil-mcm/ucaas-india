import type { DialpadSession } from '@/context/dialpad-context';
import { useDialpad } from '@/hooks/use-dialpad';
import { sessionDispositions, useDispositionSave } from '@/hooks/use-disposition-save';
import { useEffect, useMemo, useState } from 'react';

type DialpadMaxiTabDispositionsProps = {
  activeSession: DialpadSession | null;
};

/* The list of labels and the Save button. What a save does - the request,
   the agent back to Available, the next contact - lives in
   src/hooks/use-disposition-save.ts, shared with the ended screen so the
   campaign wrap-up timer can save a ticked label when it runs out. The tick
   itself is kept on the session (dispositionId), so it survives this tab
   being closed and reopened and the timer can see it. */

const DialpadMaxiTabDispositions = ({ activeSession }: DialpadMaxiTabDispositionsProps) => {
  const { patchSession } = useDialpad();
  const { save, isSaving, answerProblems } = useDispositionSave();
  const [selectedDispositionId, setSelectedDispositionId] = useState(
    String(activeSession?.dispositionId || ''),
  );

  const dispositionList = useMemo(() => sessionDispositions(activeSession), [activeSession]);

  useEffect(() => {
    setSelectedDispositionId(String(activeSession?.dispositionId || ''));
    /* Only when the call changes: a tick made here is already on the session. */
  }, [activeSession?.id]);

  /* A mandatory wrap-up demands a label. If this queue/campaign resolves to
     zero dispositions there is nothing for the agent to pick, so the ended
     screen must not wait for one - otherwise the call can never be closed. */
  useEffect(() => {
    if (!activeSession?.id) return;
    if (dispositionList.length > 0) return;
    if (activeSession.dispositionUnavailable) return;
    patchSession(activeSession.id, { dispositionUnavailable: true });
  }, [activeSession?.id, activeSession?.dispositionUnavailable, dispositionList.length, patchSession]);

  const selectedDisposition = useMemo(
    () => dispositionList.find((item) => item?._id === selectedDispositionId) || null,
    [dispositionList, selectedDispositionId],
  );

  const handleSave = () => {
    if (!activeSession || !selectedDisposition || isSaving) return;
    void save(activeSession, selectedDisposition);
  };

  if (!activeSession) {
    return (
      <div className="h-full rounded-2xl border border-ucass-active-bg bg-white px-3 py-3 max-[380px]:px-2.5 max-[380px]:py-2.5 sm:px-4 sm:py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a7396] max-[380px]:text-[10px] sm:text-xs">
          Dispositions
        </p>
        <p className="mt-2 text-[13px] text-[#6c809e] max-[380px]:text-xs sm:text-sm">
          No active session available.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full rounded-2xl border border-ucass-active-bg bg-white px-3 py-3 max-[380px]:px-2.5 max-[380px]:py-2.5 sm:px-4 sm:py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a7396] max-[380px]:text-[10px] sm:text-xs">
        Dispositions
      </p>

      {dispositionList.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-[#d7e3f6] bg-white px-2.5 py-3 text-[13px] text-[#5f7392] max-[380px]:px-2 max-[380px]:text-xs sm:px-3 sm:text-sm">
          No dispositions found for this session.
        </div>
      ) : (
        <>
          {activeSession.wrapupHeld && !activeSession.dispositionSaved ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[12px] text-amber-900">
              Wrap-up time is over. Pick an outcome and save it to finish this call.
            </p>
          ) : null}
          <div className="mt-3 space-y-2 max-[380px]:space-y-1.5 sm:space-y-2.5">
            {dispositionList.map((item, index) => {
              const dispositionId = String(item?._id || `disposition-${index}`);
              const dispositionName = item?.disposition?.name || 'Unnamed Disposition';
              const isSelected = selectedDispositionId === dispositionId;

              return (
                <label
                  key={dispositionId}
                  htmlFor={dispositionId}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2.5 transition max-[380px]:px-2 max-[380px]:py-2 sm:px-3 sm:py-3 ${
                    isSelected
                      ? 'border-[#9fc3ff] bg-[#eef5ff]'
                      : 'border-[#dce7f7] bg-white hover:border-[#c9dcf8] hover:bg-[#f7fbff]'
                  }`}
                >
                  <input
                    id={dispositionId}
                    type="radio"
                    name="dialpad-disposition"
                    value={dispositionId}
                    checked={isSelected}
                    onChange={() => {
                      setSelectedDispositionId(dispositionId);
                      /* Told to the session at once: the script beside this
                         tab may branch on the name before the save, and the
                         wrap-up timer saves the ticked id if it runs out. */
                      if (activeSession?.id) {
                        patchSession(activeSession.id, {
                          dispositionName: dispositionName,
                          dispositionId: String(item?._id || ''),
                        });
                      }
                    }}
                    className="h-4 w-4 accent-ucass-active"
                  />
                  <span className="truncate text-[13px] font-medium text-[#243a59] max-[380px]:text-xs sm:text-sm">
                    {dispositionName}
                  </span>
                </label>
              );
            })}
          </div>

          {answerProblems.length ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              <p className="font-semibold">Finish the script first</p>
              <ul className="mt-1 list-disc pl-4">
                {answerProblems.map((problem) => (
                  <li key={problem.key}>{problem.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedDisposition || isSaving}
            className="mt-3 w-full rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </>
      )}
    </div>
  );
};

export default DialpadMaxiTabDispositions;
