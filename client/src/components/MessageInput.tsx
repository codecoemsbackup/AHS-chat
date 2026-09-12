import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AtSign,
  FileText,
  Film,
  Loader2,
  Paperclip,
  Reply,
  Search,
  Send,
  X,
} from "lucide-react";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_BYTES,
  formatFileSize,
} from "@/lib/fileUploads";
import { replaceEmojiShortcodes } from "@/lib/emojiShortcodes";
import { apiRequest } from "@/lib/queryClient";

export interface MentionMember {
  id: string;
  username?: string | null;
  firstName?: string | null;
}

export interface ReplyTarget {
  id: string;
  senderName: string;
  content: string;
}

export interface GifResult {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

interface MessageInputProps {
  onSendMessage: (
    message: string,
    file?: File,
    replyToId?: string,
    mentionUserIds?: string[],
  ) => void | Promise<void>;
  placeholder?: string;
  isUploading?: boolean;
  onFileError?: (message: string) => void;
  mentionableMembers?: MentionMember[];
  replyTo?: ReplyTarget | null;
  onCancelReply?: () => void;
  onSendGif?: (
    gif: GifResult,
    message: string,
    replyToId?: string,
    mentionUserIds?: string[],
  ) => void | Promise<void>;
}

export default function MessageInput({
  onSendMessage,
  placeholder = "Type a message...",
  isUploading = false,
  onFileError,
  mentionableMembers = [],
  replyTo,
  onCancelReply,
  onSendGif,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState("");
  const [mentionUserIds, setMentionUserIds] = useState<Set<string>>(new Set());
  const [cursorPosition, setCursorPosition] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeMention = useMemo(() => {
    const beforeCursor = message.slice(0, cursorPosition);
    const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
    if (!match) return null;
    return {
      query: match[1].toLowerCase(),
      start: cursorPosition - match[1].length - 1,
    };
  }, [cursorPosition, message]);

  const mentionSuggestions = useMemo(() => {
    if (!activeMention) return [];
    return mentionableMembers
      .filter((member) => member.id && (member.username || member.firstName))
      .filter((member) => {
        const label = member.username || member.firstName || "";
        return label.toLowerCase().startsWith(activeMention.query);
      })
      .slice(0, 6);
  }, [activeMention, mentionableMembers]);

  const selectFile = (file: File) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      onFileError?.("Files must be smaller than 8 MB");
      return false;
    }
    setSelectedFile(file);
    setSelectedGif(null);
    return true;
  };

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile && !selectedGif) || isUploading) return;
    const mentions = Array.from(mentionUserIds);
    if (selectedGif) {
      if (!onSendGif) return;
      await onSendGif(selectedGif, message, replyTo?.id, mentions);
    } else {
      await onSendMessage(message, selectedFile || undefined, replyTo?.id, mentions);
    }
    setMessage("");
    setSelectedFile(null);
    setSelectedGif(null);
    setMentionUserIds(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    selectFile(file);
  };

  const searchGifs = async (query = gifQuery) => {
    setGifLoading(true);
    setGifError("");
    try {
      const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      const result = await apiRequest(`/api/gifs/search${params}`, "GET");
      setGifResults(result.gifs || []);
    } catch (error: any) {
      setGifError(error.message || "GIF search is unavailable");
      setGifResults([]);
    } finally {
      setGifLoading(false);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith("image/"),
    );
    if (!imageItem) return;
    const pastedFile = imageItem.getAsFile();
    if (!pastedFile) return;
    event.preventDefault();

    const extension =
      pastedFile.type === "image/jpeg"
        ? "jpg"
        : pastedFile.type.split("/")[1] || "png";
    const file =
      pastedFile.name && pastedFile.name !== "blob"
        ? pastedFile
        : new File([pastedFile], `pasted-image-${Date.now()}.${extension}`, {
            type: pastedFile.type,
            lastModified: Date.now(),
          });
    selectFile(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="glass-panel relative border-x-0 border-b-0 p-4">
      {replyTo && (
        <div className="glass-control mb-3 flex items-center gap-2 rounded-xl border-l-2 border-primary px-3 py-2">
          <Reply className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary">Replying to {replyTo.senderName}</p>
            <p className="truncate text-xs text-muted-foreground">{replyTo.content || "Attachment"}</p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onCancelReply}
            aria-label="Cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {selectedFile && (
        <div className="glass-control mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate">{selectedFile.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatFileSize(selectedFile.size)}
          </span>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            aria-label="Remove selected file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {selectedGif && (
        <div className="glass-control mb-3 flex items-center gap-3 rounded-xl px-3 py-2 text-sm">
          <img
            src={selectedGif.previewUrl}
            alt={selectedGif.title}
            className="h-12 w-16 rounded object-cover"
          />
          <span className="min-w-0 flex-1 truncate">GIF ready to send</span>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setSelectedGif(null)}
            aria-label="Remove selected GIF"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          className="hidden"
          onChange={handleFileChange}
          data-testid="input-file"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label="Attach a file"
          data-testid="button-attach-file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        {onSendGif && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              const nextOpen = !gifPickerOpen;
              setGifPickerOpen(nextOpen);
              if (nextOpen && gifResults.length === 0) void searchGifs("");
            }}
            disabled={isUploading}
            aria-label="Search GIFs"
            data-testid="button-gif-picker"
          >
            <Film className="h-4 w-4" />
          </Button>
        )}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            const { text: nextMessage, cursorPosition: nextCursorPosition } =
              replaceEmojiShortcodes(e.target.value, e.target.selectionStart);
            setMessage(nextMessage);
            setCursorPosition(nextCursorPosition ?? e.target.selectionStart);
            if (nextCursorPosition !== undefined && nextCursorPosition !== e.target.selectionStart) {
              requestAnimationFrame(() => {
                textareaRef.current?.setSelectionRange(nextCursorPosition, nextCursorPosition);
              });
            }
            setMentionUserIds((current) => {
              const next = new Set(
                Array.from(current).filter((id) => {
                  const member = mentionableMembers.find((item) => item.id === id);
                  const label = member?.username || member?.firstName;
                  return label ? nextMessage.toLowerCase().includes(`@${label.toLowerCase()}`) : false;
                }),
              );
              return next;
            });
          }}
          onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={isUploading ? "Uploading file..." : placeholder}
           className="glass-control min-h-10 max-h-32 resize-none"
          rows={1}
          disabled={isUploading}
          data-testid="input-message"
        />
        <Button
          onClick={() => void handleSend()}
          size="icon"
          disabled={(!message.trim() && !selectedFile && !selectedGif) || isUploading}
          data-testid="button-send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {gifPickerOpen && onSendGif && (
        <div className="glass-panel absolute bottom-20 left-4 z-30 w-[min(23rem,calc(100vw-2rem))] rounded-xl border p-3 shadow-xl">
          <form
            className="mb-3 flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void searchGifs();
            }}
          >
            <Input
              value={gifQuery}
              onChange={(event) => setGifQuery(event.target.value)}
              placeholder="Search Tenor GIFs"
              aria-label="Search Tenor GIFs"
              autoFocus
            />
            <Button type="submit" size="icon" variant="secondary" disabled={gifLoading}>
              {gifLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </form>
          {gifError && <p className="mb-2 text-xs text-destructive">{gifError}</p>}
          {gifLoading && gifResults.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading GIFs...
            </div>
          ) : gifResults.length > 0 ? (
            <div className="grid max-h-64 grid-cols-3 gap-1 overflow-y-auto">
              {gifResults.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  className="overflow-hidden rounded-lg border border-transparent transition hover:border-primary focus-visible:border-primary"
                  onClick={() => {
                    setSelectedGif(gif);
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    setGifPickerOpen(false);
                  }}
                  title={gif.title}
                >
                  <img
                    src={gif.previewUrl}
                    alt={gif.title}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Search for a GIF to get started.
            </p>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">Powered by Tenor</p>
        </div>
      )}
      {mentionSuggestions.length > 0 && activeMention && (
        <div className="glass-panel absolute bottom-20 left-4 z-20 w-64 overflow-hidden rounded-xl border p-1 shadow-xl">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Mention someone
          </p>
          {mentionSuggestions.map((member) => {
            const label = member.username || member.firstName || "Member";
            return (
              <button
                key={member.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-primary/10"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const start = activeMention.start;
                  const nextMessage = `${message.slice(0, start)}@${label} ${message.slice(cursorPosition)}`;
                  const nextCursor = start + label.length + 2;
                  setMessage(nextMessage);
                  setMentionUserIds((current) => new Set(current).add(member.id));
                  setCursorPosition(nextCursor);
                  requestAnimationFrame(() => {
                    textareaRef.current?.focus();
                    textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
                  });
                }}
              >
                <AtSign className="h-4 w-4 text-primary" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
