/* The Quality badge on a call log row, and the plain-words panel behind it. */
import { useEffect, useRef, useState } from 'react';
import { BAND_CLASS, BAND_LABEL, readCallQuality } from '@/lib/call-quality';

interface Props {
  row: any;
}

const CallQualityBadge = ({ row }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const quality = readCallQuality(row);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!quality) {
    return (
      <span
        className="text-[12px] text-gray-400"
        title="The switch did not measure this call (it never connected, or it predates 9 Sep 2026)."
      >
        ---
      </span>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        title={quality.summary}
        aria-expanded={open}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium ${BAND_CLASS[quality.band]}`}
      >
        {BAND_LABEL[quality.band]}
        <span className="text-[10px] font-normal opacity-80">{quality.mos?.toFixed(1)}</span>
      </button>
      {open ? (
        <div
          role="dialog"
          className="absolute left-0 z-30 mt-1 w-80 rounded-md border border-gray-200 bg-white p-3 text-left text-[12px] leading-5 text-gray-800 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="mb-1 font-semibold">{quality.summary}</p>
          <ul className="mb-2 list-disc space-y-1 pl-4">
            {quality.explanations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {quality.likelyCause ? (
            <p className="rounded bg-gray-50 p-2 text-gray-700">
              <span className="font-semibold">Most likely cause: </span>
              {quality.likelyCause}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-gray-500">
            Measured by the phone switch on the audio it received. For a call with several legs the
            worst leg is shown.
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default CallQualityBadge;
