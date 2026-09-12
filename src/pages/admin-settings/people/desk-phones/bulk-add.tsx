/* Add many desk phones at once: paste rows or choose a CSV. One line per
   phone. The server saves every clean row and reports each bad one with its
   line number, so one typo never blocks the rest of the delivery.

   Laid out in the order the work happens: get the rows in, see how many
   there are, add them, read what was refused. The column reference used to
   sit above all of that and filled the screen before the box was even
   reached; it is now a section that opens when it is wanted, because the
   example inside the box teaches the same shape at a glance and nobody needs
   the reference twice. */

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, FileUp, Download } from 'lucide-react';
import { handleAlert } from '@/lib/utils';
import {
  bulkAddDeskPhones,
  describeError,
  DESK_PHONES_QUERY_KEY,
  TEMPLATE_CSV,
  type BulkOutcome,
} from './desk-phones-api';

/* The box shows the very file the Download button gives you. They used to be
   written out separately and had drifted a column apart, so the example on
   screen taught a shape the template did not have. */
const PLACEHOLDER = TEMPLATE_CSV;

const COLUMNS: [string, string][] = [
  ['mac_address', 'Required. The 12-character code on the label under the phone.'],
  ['vendor', 'Required. yealink, poly, poly-obi, cisco or grandstream.'],
  ['model', 'Required. T46U, VVX450, SPA942 and so on.'],
  ['serial_number', 'Only Grandstream needs it. Next to the MAC on the label.'],
  ['owner', "The person's email address or extension. Leave blank for a room phone."],
  ['label', "A name for the phone. Defaults to the owner's name."],
  ['site', 'The location it stands in, by name.'],
  ['room_extension', 'For a room phone only: the extension it rings on, 3 to 6 digits.'],
];

/* How many phones the server will see. The count used to be every non-blank
   line, which counted the header as a phone and told you "3 lines" for a
   two-phone file. A header is a first line that names a MAC column but does
   not hold a MAC - the same rule the server parses by. */
const MAC_HEADERS = ['mac', 'macaddress', 'mac_address', 'hardwareid'];
const looksLikeMac = (cell: string) => /^[0-9a-f]{12}$/i.test(cell.trim().replace(/^0x/i, '').replace(/[\s:\-.]/g, ''));
const countPhones = (text: string): number => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
  if (!lines.length) return 0;
  const cells = lines[0].split(/[,;\t]/).map((c) => c.trim());
  const macColumn = cells.findIndex(
    (c) =>
      MAC_HEADERS.includes(c.toLowerCase().replace(/\s+/g, '_')) ||
      MAC_HEADERS.includes(c.toLowerCase().replace(/\s+/g, '')),
  );
  const isHeader = macColumn >= 0 && !looksLikeMac(cells[macColumn] ?? '');
  return isHeader ? lines.length - 1 : lines.length;
};

const BulkAdd = ({ onDone }: { onDone: () => void }) => {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [showColumns, setShowColumns] = useState(false);
  const [outcome, setOutcome] = useState<{ message: string; outcome: BulkOutcome } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: bulkAddDeskPhones,
    onSuccess: (result) => {
      setOutcome(result);
      setError('');
      if (result.outcome.added.length) {
        handleAlert({ text: result.message || `${result.outcome.added.length} added.`, type: 'success' });
        queryClient.invalidateQueries({ queryKey: DESK_PHONES_QUERY_KEY });
      }
      /* Nothing left to add: empty the box, or a second press would refuse
         every line as already in the list and read like a failure. */
      if (!result.outcome.rejected.length) {
        setText('');
        setFileName('');
      }
    },
    onError: (err: any) => {
      setOutcome(null);
      setError(describeError(err, 'Could not add these phones.'));
    },
  });

  const readFile = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setError('');
    setOutcome(null);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsText(file);
  };

  /* The link has to be in the document for Firefox to follow it, and the
     object URL has to outlive the click or the download races the revoke. */
  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'desk-phones-template.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const phoneCount = countPhones(text);
  const added = outcome?.outcome.added.length ?? 0;
  const refused = outcome?.outcome.rejected.length ?? 0;

  /* Same as the single-add form: the drawer hides overflow above `md`, so
     this takes the height it is given and scrolls its own middle. The actions
     stay pinned, which matters most here - the result of an upload appears
     above them and would otherwise push them off the screen. */
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <p className="text-sm text-gray-600">
        One phone per line. Paste them below, or choose a CSV file. A header row naming the columns
        is fine in any order, and lines starting with # are ignored.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn ghost sm" onClick={downloadTemplate}>
          <Download className="h-3.5 w-3.5" />
          Download template
        </button>
        <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()}>
          <FileUp className="h-3.5 w-3.5" />
          Choose CSV file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            readFile(e.target.files?.[0]);
            /* Cleared so choosing the same file again still fires a change. */
            e.target.value = '';
          }}
        />
        {fileName ? <span className="truncate text-xs text-gray-500">{fileName}</span> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <textarea
          className="min-h-[200px] w-full rounded-lg border border-gray-200 p-3 font-mono text-xs"
          placeholder={PLACEHOLDER}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOutcome(null);
            setError('');
          }}
          spellCheck={false}
        />
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-gray-500">
            {phoneCount ? `${phoneCount} phone${phoneCount === 1 ? '' : 's'} to add` : 'Nothing pasted yet'}
          </span>
          <button
            type="button"
            className="flex items-center gap-1 text-gray-500 hover:text-gray-800"
            aria-expanded={showColumns}
            onClick={() => setShowColumns((s) => !s)}
          >
            What each column means
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showColumns ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {showColumns ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <table className="w-full text-xs">
            <tbody>
              {COLUMNS.map(([column, what]) => (
                <tr key={column} className="align-top">
                  <td className="w-32 py-0.5 pr-3 font-mono text-gray-500">{column}</td>
                  <td className="py-0.5 text-gray-700">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-500">
            A phone has an owner or a room extension, never both.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      {outcome ? (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {added} added
            </span>
            {refused ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                {refused} not added
              </span>
            ) : null}
            <span className="text-xs text-gray-500">of {outcome.outcome.total_rows} rows</span>
          </div>
          {refused ? (
            <>
              <p className="text-xs text-gray-500">
                Fix these lines in the box above and press Add phones again. The ones already added
                are not touched.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-1 pr-3 font-medium">Line</th>
                      <th className="py-1 pr-3 font-medium">Column</th>
                      <th className="py-1 font-medium">What to fix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outcome.outcome.rejected.map((p, i) => (
                      <tr key={`${p.row}-${p.field}-${i}`} className="border-t border-gray-100 align-top">
                        <td className="py-1 pr-3 tabular-nums">{p.row}</td>
                        <td className="py-1 pr-3 font-mono text-gray-500">{p.field}</td>
                        <td className="py-1">{p.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 px-4 py-3">
        <button type="button" className="btn" onClick={onDone} disabled={isPending}>
          {outcome && !refused ? 'Close' : 'Cancel'}
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={isPending || !text.trim()}
          onClick={() => mutate(text)}
        >
          {isPending
            ? 'Adding…'
            : phoneCount
              ? `Add ${phoneCount} phone${phoneCount === 1 ? '' : 's'}`
              : 'Add phones'}
        </button>
      </div>
    </div>
  );
};

export default BulkAdd;
