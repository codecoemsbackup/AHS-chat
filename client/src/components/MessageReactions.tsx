import { useState } from "react";
import { SmilePlus } from "lucide-react";
import type { MessageReactionSummary } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "😢", "🔥", "👏"];

interface MessageReactionsProps {
  reactions: MessageReactionSummary[];
  onToggle: (emoji: string) => Promise<void>;
  disabled?: boolean;
}

export default function MessageReactions({
  reactions,
  onToggle,
  disabled = false,
}: MessageReactionsProps) {
  const { toast } = useToast();
  const [emoji, setEmoji] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const ownReactionCount = reactions.filter((reaction) => reaction.reactedByMe).length;
  const canAddReaction = ownReactionCount < 10;

  const toggle = async (value: string) => {
    if (disabled || pending) return;
    setPending(value);
    try {
      await onToggle(value);
      setEmoji("");
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Couldn't update reaction",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="mt-1 flex max-w-full flex-wrap items-center gap-1.5">
      {reactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void toggle(reaction.emoji)}
          disabled={disabled || pending !== null || (!reaction.reactedByMe && !canAddReaction)}
          aria-pressed={reaction.reactedByMe}
          aria-label={`${reaction.emoji} ${reaction.count} ${reaction.count === 1 ? "reaction" : "reactions"}`}
          className={`h-7 min-w-10 gap-1 rounded-full px-2 ${
            reaction.reactedByMe ? "border-primary bg-primary/10" : ""
          }`}
        >
          <span>{reaction.emoji}</span>
          <span className="text-xs tabular-nums">{reaction.count}</span>
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || pending !== null || (!canAddReaction && !open)}
            aria-label="Add reaction"
            title={canAddReaction ? "Add reaction" : "You have used all 10 reactions for this message"}
            className="h-7 w-7 rounded-full text-muted-foreground"
          >
            <SmilePlus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3 p-3" align="start">
          <div className="grid grid-cols-8 gap-1">
            {QUICK_EMOJIS.map((quickEmoji) => (
              <button
                key={quickEmoji}
                type="button"
                disabled={!canAddReaction || pending !== null}
                onClick={() => void toggle(quickEmoji)}
                className="rounded p-1.5 text-lg hover:bg-accent disabled:opacity-40"
                aria-label={`React with ${quickEmoji}`}
              >
                {quickEmoji}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (emoji.trim()) void toggle(emoji.trim());
            }}
          >
            <Input
              value={emoji}
              onChange={(event) => setEmoji(event.target.value)}
              placeholder="Type or paste any emoji"
              aria-label="Custom emoji"
              maxLength={32}
              disabled={!canAddReaction || pending !== null}
            />
            <Button type="submit" size="sm" disabled={!canAddReaction || !emoji.trim() || pending !== null}>
              Add
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            {ownReactionCount}/10 reactions used
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
