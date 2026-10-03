import { useState } from "react";
import { Check, ListChecks, Reply, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PollDefinition, PollResults, ServerMessageWithRelations } from "@shared/schema";

interface PollCardProps {
  poll: PollDefinition;
  results: PollResults;
  senderName: string;
  timestamp: string;
  canDelete?: boolean;
  onDelete?: () => void;
  onReply?: () => void;
  onVote: (optionIndexes: number[]) => Promise<ServerMessageWithRelations | undefined>;
}

export default function PollCard({
  poll,
  results,
  senderName,
  timestamp,
  canDelete = false,
  onDelete,
  onReply,
  onVote,
}: PollCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<number[]>(results.userOptionIndexes);
  const [isSaving, setIsSaving] = useState(false);
  const totalVoters = results.totalVoters;
  const hasVoted = results.userOptionIndexes.length > 0;

  const toggleOption = (index: number) => {
    setSelectedOptions((current) => {
      if (poll.allowMultiple) {
        return current.includes(index)
          ? current.filter((selected) => selected !== index)
          : [...current, index];
      }
      return [index];
    });
  };

  const submitVote = async () => {
    if (!selectedOptions.length || isSaving) return;
    setIsSaving(true);
    try {
      const updated = await onVote(selectedOptions);
      if (updated) {
        setSelectedOptions(updated.pollResults?.userOptionIndexes || selectedOptions);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="group relative glass-panel w-full max-w-[min(42rem,85%)] rounded-2xl border p-4 shadow-sm">
      <div className="absolute right-2 top-2 flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {onReply && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onReply} aria-label="Reply to poll">
            <Reply className="h-4 w-4" />
          </Button>
        )}
        {canDelete && onDelete && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete} aria-label="Delete poll">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ListChecks className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted-foreground">{senderName} created a poll</p>
          <h3 className="mt-1 break-words font-semibold">{poll.question}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {poll.allowMultiple ? "Select all that apply" : "Choose one"}
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {poll.options.map((option, index) => {
          const count = results.counts[index] || 0;
          const percentage = totalVoters ? Math.round((count / totalVoters) * 100) : 0;
          const selected = selectedOptions.includes(index);
          const votedFor = results.userOptionIndexes.includes(index);
          return (
            <button
              key={`${option}-${index}`}
              type="button"
              onClick={() => toggleOption(index)}
              disabled={isSaving}
              aria-pressed={selected}
              className={`relative flex min-h-11 w-full items-center justify-between overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                selected ? "border-primary bg-primary/10" : "glass-control hover:border-primary/50"
              }`}
            >
              {hasVoted && (
                <span
                  className="absolute inset-y-0 left-0 bg-primary/10 transition-[width]"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              )}
              <span className="relative flex min-w-0 items-center gap-2">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                  poll.allowMultiple ? "rounded-sm" : "rounded-full"
                } ${
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50"
                }`}>
                  {(selected || votedFor) && <Check className="h-3 w-3" />}
                </span>
                <span className="break-words">{option}</span>
              </span>
              {hasVoted && (
                <span className="relative ml-2 shrink-0 text-xs text-muted-foreground">
                  {percentage}% · {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {totalVoters} {totalVoters === 1 ? "vote" : "votes"} · {timestamp}
        </span>
        <Button
          type="button"
          size="sm"
          onClick={() => void submitVote()}
          disabled={selectedOptions.length === 0 || isSaving}
        >
          {isSaving ? "Submitting..." : hasVoted ? "Change vote" : "Vote"}
        </Button>
      </div>
    </div>
  );
}
