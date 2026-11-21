import { lazy, Suspense, useState } from "react";
import { SmilePlus } from "lucide-react";
import type { MessageReactionSummary } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useToast } from "@/hooks/use-toast";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

interface MessageReactionsProps {
  reactions: MessageReactionSummary[];
  onToggle: (emoji: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export default function MessageReactions({
  reactions,
  onToggle,
  disabled = false,
  className,
}: MessageReactionsProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const ownReactionCount = reactions.filter((reaction) => reaction.reactedByMe).length;
  const canAddReaction = ownReactionCount < 10;

  const toggle = async (value: string) => {
    if (disabled || pending) return;
    setPending(value);
    try {
      await onToggle(value);
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
    <div className={`mt-1 flex max-w-full flex-wrap items-center gap-1.5 ${className || ""}`}>
      {reactions.map((reaction) => (
        <HoverCard key={reaction.emoji} openDelay={250}>
          <HoverCardTrigger asChild>
            <div
              tabIndex={0}
              role="group"
              aria-label={`${reaction.emoji} reaction by ${reaction.users?.map((user) => user.name).join(", ") || "unknown users"}`}
              className={`inline-flex h-7 items-center rounded-full border ${
                reaction.reactedByMe
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background"
              }`}
            >
              <button
                type="button"
                onClick={() => void toggle(reaction.emoji)}
                disabled={disabled || pending !== null || (!reaction.reactedByMe && !canAddReaction)}
                aria-pressed={reaction.reactedByMe}
                aria-label={`Toggle ${reaction.emoji} reaction`}
                className="h-full rounded-l-full px-2 text-sm hover:bg-muted/50 disabled:opacity-50"
              >
                {reaction.emoji}
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={`See who reacted with ${reaction.emoji}`}
                    title="See who reacted"
                    className="h-full rounded-r-full px-1.5 text-xs tabular-nums hover:bg-muted/50"
                  >
                    {reaction.count}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto max-w-64 p-3" side="top" align="start">
                  <p className="mb-1 text-xs font-semibold">{reaction.emoji} Reacted by</p>
                  <p className="text-sm text-muted-foreground">
                    {reaction.users
                      ? reaction.users.map((user) => user.name).join(", ") || "No one"
                      : "Reactor names unavailable"}
                  </p>
                </PopoverContent>
              </Popover>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto max-w-64 p-3" side="top" align="start">
            <p className="mb-1 text-xs font-semibold">{reaction.emoji} Reacted by</p>
            <p className="text-sm text-muted-foreground">
              {reaction.users
                ? reaction.users.map((user) => user.name).join(", ") || "No one"
                : "Reactor names unavailable"}
            </p>
          </HoverCardContent>
        </HoverCard>
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
            className="h-7 w-7 rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <SmilePlus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Suspense
            fallback={
              <div className="flex h-[380px] items-center justify-center text-sm text-muted-foreground">
                Loading emoji...
              </div>
            }
          >
            <EmojiPicker
              colorScheme="auto"
              width="min(340px, calc(100vw - 2rem))"
              height={380}
              className="message-reaction-emoji-picker"
              lazyLoadEmojis
              suggestedEmojisMode="frequent"
              onEmojiClick={({ emoji: selectedEmoji }) => {
                if (!canAddReaction || pending !== null) return;
                void toggle(selectedEmoji);
              }}
            />
          </Suspense>
          <p className="px-2 pt-2 text-xs text-muted-foreground">
            {ownReactionCount}/10 reactions used
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
