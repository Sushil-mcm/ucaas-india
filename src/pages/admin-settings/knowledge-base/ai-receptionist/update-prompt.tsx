import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { sanitizeAiPromptText } from '@/lib/ai-input-security';
import { useEffect, useState } from 'react';

const PromptModal = ({ open, setOpen, data, onUpdate, isUpdating }: any) => {
  const [systemPrompt, setSystemPrompt] = useState(() =>
    sanitizeAiPromptText(data?.systemPrompt || data?.system_prompt || ''),
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSystemPrompt(sanitizeAiPromptText(data?.systemPrompt || data?.system_prompt || ''));
      setError('');
    }
  }, [open, data]);

  const handleSave = () => {
    if (!systemPrompt?.trim()) {
      setError('System Prompt is required.');
      return;
    }
    const safeSystemPrompt = sanitizeAiPromptText(systemPrompt).trim();
    const { updated_at, ...restData } = data;
    console.info(updated_at);
    onUpdate(restData, safeSystemPrompt, () => {
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>System Prompt</DialogTitle>
        </DialogHeader>
        <div className="">
          {/* <label className="block text-sm font-semibold text-[#091A3A]">System Prompt</label>
          <p className="mt-1 text-xs text-[#667085]">
            Provide core behavioral instructions. This defines the AI's persona, operational boundaries, tone, and specific interaction rules.
          </p> */}
          <div
            className={`mt-3 overflow-hidden rounded-2xl border bg-white ring-4 ring-primary/10 ${
              error ? 'border-red-400' : 'border-primary'
            }`}
          >
            <textarea
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(sanitizeAiPromptText(e.target.value));
                setError('');
              }}
              rows={12}
              className="w-full resize-none border-none p-4 text-sm text-[#091A3A] outline-none placeholder:text-gray-400 scrollbar-hide"
              placeholder="Provide core behavioral instructions..."
            />
          </div>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
        <DialogFooter className="mt-2 flex items-center gap-3 flex-row-reverse justify-start">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PromptModal;
