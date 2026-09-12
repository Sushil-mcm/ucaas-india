import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchAuthenticatedMedia } from '@/hooks/use-authenticated-media';

/* Reads a voicemail's transcript and shows it as text.
 *
 * The switch's uploader stores `<call uuid>_transcript.json` next to the
 * recording and the call row's `transcript_file` names it. The document is the
 * shape src/pages/phone/transcript-info.tsx reads for call transcripts: a
 * `speaker` list of turns. A voicemail has one turn (the caller), so this
 * viewer is deliberately smaller than the call-intelligence panel: the words,
 * who left them, and nothing to configure. */

type TranscriptTurn = { text?: string; speaker?: string; speakerDetails?: { userName?: string } };

export const transcriptText = (doc: unknown): string => {
  if (!doc || typeof doc !== 'object') return '';
  const anyDoc = doc as { speaker?: unknown; transcript?: unknown; text?: unknown };
  if (Array.isArray(anyDoc.speaker)) {
    return (anyDoc.speaker as TranscriptTurn[])
      .map((turn) => String(turn?.text || '').trim())
      .filter(Boolean)
      .join('\n\n');
  }
  if (typeof anyDoc.transcript === 'string') return anyDoc.transcript.trim();
  if (typeof anyDoc.text === 'string') return anyDoc.text.trim();
  return '';
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /* Full media URL of the transcript document. */
  url: string;
  /* Who left the message and when, for the heading. */
  from?: string;
  when?: string;
};

const VoicemailTranscriptDialog = ({ open, onOpenChange, url, from, when }: Props) => {
  const [state, setState] = useState<{ loading: boolean; text: string; error: string }>({
    loading: false,
    text: '',
    error: '',
  });

  useEffect(() => {
    if (!open || !url) return;
    const controller = new AbortController();
    setState({ loading: true, text: '', error: '' });
    fetchAuthenticatedMedia(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`The transcript could not be fetched (${response.status}).`);
        const doc = await response.json();
        const text = transcriptText(doc);
        setState({
          loading: false,
          text,
          error: text ? '' : 'The transcript file is empty.',
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          loading: false,
          text: '',
          error: error instanceof Error ? error.message : 'The transcript could not be read.',
        });
      });
    return () => controller.abort();
  }, [open, url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Voicemail transcript</DialogTitle>
          <DialogDescription>
            {from ? `From ${from}` : 'What the caller said'}
            {when ? ` · ${when}` : ''}
          </DialogDescription>
        </DialogHeader>
        {state.loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading the transcript…
          </div>
        ) : state.error ? (
          <p className="py-4 text-sm text-red-600">{state.error}</p>
        ) : (
          <p className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-800">
            {state.text}
          </p>
        )}
        <p className="text-xs text-gray-500">
          Written out by the transcription service from the recording. Listen to the message if a
          word matters.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default VoicemailTranscriptDialog;
