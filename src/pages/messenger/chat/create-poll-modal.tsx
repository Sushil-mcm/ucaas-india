import React, { useState } from 'react';
import { Plus, Trash2, BarChart2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { v4 as uuidV4 } from 'uuid';

interface CreatePollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (pollData: {
    question: string;
    options: any[];
    isMultipleChoice: boolean;
    allowViewVotes: boolean;
  }) => void;
}

const CreatePollModal: React.FC<CreatePollModalProps> = ({ open, onOpenChange, onSend }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);

  const handleAddOption = () => {
    if (options.length < 12) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    const trimmedQuestion = question.trim();
    const validOptions = options.map((opt) => opt.trim()).filter((opt) => opt.length > 0);

    if (!trimmedQuestion) return;
    if (validOptions.length < 2) return;

    onSend({
      question: trimmedQuestion,
      options: validOptions.map((text) => ({
        id: uuidV4(),
        text,
        votes: [],
      })),
      isMultipleChoice,
      allowViewVotes: true,
    });

    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setQuestion('');
    setOptions(['', '']);
    setIsMultipleChoice(false);
  };

  const trimmedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
  const uniqueOptions = new Set(trimmedOptions);
  const hasDuplicates = trimmedOptions.length > uniqueOptions.size;
  const canSubmit = question.trim().length > 0 && trimmedOptions.length >= 2 && !hasDuplicates;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          handleReset();
        }
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-[425px] bg-white rounded-xl shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-center gap-2 text-primary">
            <BarChart2 className="w-5 h-5" />
            <DialogTitle className="text-xl font-bold">Create Poll</DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="question" className="text-sm font-semibold text-gray-700">
                Question
              </Label>
              {question.length > 0 && (
                <span className="text-[11px] text-gray-400 font-medium">{question.length}/255</span>
              )}
            </div>
            <Input
              id="question"
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={255}
              className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20 rounded-lg"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-semibold text-gray-700">Options</Label>
              <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                {options.length} / 12
              </span>
            </div>

            <div className="space-y-3 pr-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2 group">
                  <div className="flex-1 relative">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      maxLength={50}
                      className="h-10 border-gray-200 focus:border-primary focus:ring-primary/20 rounded-lg pr-12"
                    />
                    {option.length > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                        {option.length}/50
                      </div>
                    )}
                  </div>
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      className="h-10 w-10 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {hasDuplicates && (
              <p className="text-red-500 text-xs font-medium">Duplicate options are not allowed.</p>
            )}

            {options.length < 12 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="w-full h-10 border-dashed border-gray-300 text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 rounded-lg flex items-center justify-center gap-2 mt-2"
              >
                <Plus className="w-4 h-4" />
                Add Option
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <Checkbox
                id="multiple-choice"
                checked={isMultipleChoice}
                onCheckedChange={(checked) => setIsMultipleChoice(!!checked)}
                className="accent-primary"
              />
              <Label
                htmlFor="multiple-choice"
                className="text-sm font-medium leading-none cursor-pointer text-gray-700"
              >
                Allow multiple answers
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 mt-2 border-t border-gray-100 shrink-0">
          <Button
            type="button"
            variant="destructiveOutline"
            onClick={() => {
              handleReset();
              onOpenChange(false);
            }}
            className="flex-1 h-11 text-slate-700  hover:!text-primary transition-colors cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/20"
          >
            Create Poll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePollModal;
