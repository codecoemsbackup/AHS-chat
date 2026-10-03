import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PollCreateDialogProps {
  open: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (poll: { question: string; options: string[]; allowMultiple: boolean }) => void;
}

export default function PollCreateDialog({
  open,
  isSaving,
  onOpenChange,
  onCreate,
}: PollCreateDialogProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
  }, [open]);

  const updateOption = (index: number, value: string) => {
    setOptions((current) => current.map((option, optionIndex) => optionIndex === index ? value : option));
  };
  const readyOptions = options.map((option) => option.trim()).filter(Boolean);
  const optionsAreUnique =
    new Set(readyOptions.map((option) => option.toLowerCase())).size === readyOptions.length;
  const canCreate =
    question.trim().length > 0 &&
    question.trim().length <= 200 &&
    readyOptions.length >= 2 &&
    readyOptions.length <= 10 &&
    readyOptions.every((option) => option.length <= 80) &&
    optionsAreUnique;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a poll</DialogTitle>
          <DialogDescription>
            Ask a question and add two to ten answer choices.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canCreate || isSaving) return;
            onCreate({ question: question.trim(), options: readyOptions, allowMultiple });
          }}
        >
          <div className="space-y-2">
            <label htmlFor="poll-question" className="text-sm font-medium">Question</label>
            <Input
              id="poll-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask the community..."
              maxLength={200}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Answers</span>
              <span className="text-xs text-muted-foreground">{readyOptions.length}/10</span>
            </div>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(event) => updateOption(index, event.target.value)}
                  placeholder={`Answer ${index + 1}`}
                  maxLength={80}
                  aria-label={`Answer ${index + 1}`}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))}
                    aria-label={`Remove answer ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOptions((current) => [...current, ""])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add answer
              </Button>
            )}
            {!optionsAreUnique && (
              <p className="text-xs text-destructive">Each answer must be different.</p>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={allowMultiple} onCheckedChange={(checked) => setAllowMultiple(checked === true)} />
            Allow multiple answers
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canCreate || isSaving}>
              {isSaving ? "Creating..." : "Create poll"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
