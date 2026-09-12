import { Fragment } from "react";
import { AtSign, Download, FileText, Reply, Trash2 } from "lucide-react";
import UserAvatar from "./UserAvatar";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/fileUploads";
import type { MessageReplyPreview } from "@shared/schema";

interface ChatBubbleProps {
  message: string;
  timestamp: string;
  isSent: boolean;
  senderName?: string;
  avatarUrl?: string | null;
  attachment?: {
    url: string;
    name: string;
    mimeType: string;
    size: number;
  };
  canDelete?: boolean;
  onDelete?: () => void;
  reply?: MessageReplyPreview;
  onReply?: () => void;
  mentionNames?: string[];
  isMentionedUser?: boolean;
}

export default function ChatBubble({
  message,
  timestamp,
  isSent,
  senderName,
  avatarUrl,
  attachment,
  canDelete = false,
  onDelete,
  reply,
  onReply,
  mentionNames = [],
  isMentionedUser = false,
}: ChatBubbleProps) {
  const escapedMentionNames = mentionNames
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const mentionPattern = escapedMentionNames.length
    ? new RegExp(`(@(?:${escapedMentionNames.join("|")}))(?=\\b|\\s|$|[.,!?])`, "gi")
    : null;
  const messageParts = mentionPattern ? message.split(mentionPattern) : [message];

  return (
    <div
      className={`group mb-5 flex w-full gap-3 ${isSent ? "justify-end" : "justify-start"}`}
      data-testid={`message-${isSent ? "sent" : "received"}`}
    >
      {!isSent && senderName && (
        <div className="mt-5 shrink-0">
          <UserAvatar name={senderName} avatarUrl={avatarUrl || undefined} size="sm" />
        </div>
      )}
      <div
        className={`relative flex min-w-0 max-w-[min(42rem,85%)] flex-col ${
          isSent ? "items-end" : "items-start"
        }`}
      >
        {senderName && !isSent && (
          <span className="mb-1 px-1 text-xs font-semibold text-muted-foreground">
            {senderName}
          </span>
        )}
        {reply && (
          <div className="mb-1 max-w-full border-l-2 border-primary/60 px-2 text-left text-xs text-muted-foreground">
            <span className="font-semibold text-primary">Replying to {reply.senderName}</span>
            <p className="truncate">{reply.content || "Attachment"}</p>
          </div>
        )}
        {isMentionedUser && (
          <span className="mb-1 inline-flex items-center gap-1 rounded-md border border-amber-400 bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow-sm dark:bg-amber-300 dark:text-amber-950">
            <AtSign className="h-3 w-3" />
            You were mentioned
          </span>
        )}
        <div
          className={`relative inline-flex h-fit max-w-full rounded-2xl px-3.5 py-1.5 shadow-sm ${
            isSent
              ? "glass-bubble-sent rounded-br-md text-primary-foreground"
              : "glass-bubble rounded-bl-md border"
          } ${isMentionedUser ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-background" : ""}`}
        >
          {message && (
            <p className="m-0 whitespace-pre-wrap break-words text-center text-sm leading-5">
              {messageParts.map((part, index) => {
                const isMention =
                  index % 2 === 1 &&
                  mentionNames.some(
                    (name) => `@${name}`.toLowerCase() === part.toLowerCase(),
                  );
                return isMention ? (
                  <span
                    key={`${part}-${index}`}
                    className={`mx-0.5 inline-flex items-center rounded-md border px-1.5 py-0.5 font-semibold leading-4 shadow-sm ${
                      isSent
                        ? "border-amber-100 bg-amber-300 text-amber-950 ring-2 ring-amber-200/80"
                        : "border-amber-500 bg-amber-100 text-amber-950 ring-1 ring-amber-300/80 dark:bg-amber-300 dark:text-amber-950"
                    }`}
                  >
                    {part}
                  </span>
                ) : (
                  <Fragment key={`${part}-${index}`}>{part}</Fragment>
                );
              })}
            </p>
          )}
          {attachment && (
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              download={attachment.name}
              className="mt-1 flex max-w-full items-center gap-2 rounded-lg border border-current/15 bg-background/50 p-2 text-left transition-colors hover:bg-background/80"
            >
              {attachment.mimeType.startsWith("image/") ? (
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="max-h-64 max-w-full rounded object-contain"
                />
              ) : (
                <>
                  <FileText className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{attachment.name}</span>
                    <span className="block text-[11px] opacity-70">
                      {formatFileSize(attachment.size)}
                    </span>
                  </span>
                  <Download className="h-4 w-4 shrink-0 opacity-70" />
                </>
              )}
            </a>
          )}
          {canDelete && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-8 top-1 h-7 w-7 bg-background/90 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={onDelete}
              aria-label="Delete message"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
          {onReply && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-8 top-9 h-7 w-7 bg-background/90 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={onReply}
              aria-label="Reply to message"
            >
              <Reply className="h-3.5 w-3.5 text-primary" />
            </Button>
          )}
        </div>
        <span
          className={`pointer-events-none absolute -bottom-5 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${
            isSent ? "right-1" : "left-1"
          }`}
        >
          {timestamp}
        </span>
      </div>
    </div>
  );
}
