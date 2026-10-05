import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, MessageSquare, Send, X } from "lucide-react";
import type {
  DmConversationWithPeer,
  DmMessageWithSender,
  MessagePage,
  MessageReactionSummary,
} from "@shared/schema";
import ChatBubble from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const MESSAGE_PAGE_SIZE = 30;

interface DirectMessagePanelProps {
  conversation: DmConversationWithPeer;
  currentUserId: string;
  onBack: () => void;
  onRespond: (accepted: boolean) => void;
}

export default function DirectMessagePanel({
  conversation,
  currentUserId,
  onBack,
  onRespond,
}: DirectMessagePanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageScrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollRestoreRef = useRef<{
    element: HTMLElement;
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);
  const loadingOlderRef = useRef(false);
  const previousMessagesRef = useRef<{ conversationId: string; lastMessageId?: string }>({
    conversationId: conversation.id,
  });
  const peerName = conversation.peer.username || conversation.peer.firstName || "Member";
  const messagesUrl = `/api/dms/${conversation.id}/messages`;
  const { data: messagePage, isLoading } = useQuery<MessagePage<DmMessageWithSender>>({
    queryKey: [messagesUrl],
    enabled: conversation.status === "accepted",
  });
  const messages = messagePage?.messages || [];

  useLayoutEffect(() => {
    const previous = previousMessagesRef.current;
    const lastMessageId = messages[messages.length - 1]?.id;
    const restore = scrollRestoreRef.current;
    if (restore) {
      restore.element.scrollTop =
        restore.scrollTop + (restore.element.scrollHeight - restore.scrollHeight);
      scrollRestoreRef.current = null;
    } else if (
      !isLoading &&
      messages.length > 0 &&
      (
        previous.conversationId !== conversation.id ||
        previous.lastMessageId !== lastMessageId
      )
    ) {
      const viewport = messageScrollAreaRef.current?.querySelector<HTMLElement>(
        "[data-radix-scroll-area-viewport]",
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
        requestAnimationFrame(() => {
          viewport.scrollTop = viewport.scrollHeight;
        });
      } else {
        messagesEndRef.current?.scrollIntoView();
      }
    }
    previousMessagesRef.current = { conversationId: conversation.id, lastMessageId };
  }, [messages, conversation.id, isLoading]);

  const loadOlderMessages = async (element: HTMLElement) => {
    if (
      element.scrollTop > 40 ||
      !messagePage?.hasMore ||
      loadingOlderRef.current ||
      !messages.length
    ) {
      return;
    }
    const oldestMessage = messages[0];
    if (!oldestMessage.createdAt) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    scrollRestoreRef.current = {
      element,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    };
    const params = new URLSearchParams({
      limit: String(MESSAGE_PAGE_SIZE),
      beforeCreatedAt: new Date(oldestMessage.createdAt).toISOString(),
      beforeId: oldestMessage.id,
    });
    try {
      const olderPage: MessagePage<DmMessageWithSender> = await apiRequest(
        `${messagesUrl}?${params}`,
        "GET",
      );
      queryClient.setQueryData<MessagePage<DmMessageWithSender>>(
        [messagesUrl],
        (current) => {
          if (!current) return olderPage;
          const existingIds = new Set(current.messages.map((message) => message.id));
          const olderMessages = olderPage.messages.filter((message) => !existingIds.has(message.id));
          return { hasMore: olderPage.hasMore, messages: [...olderMessages, ...current.messages] };
        },
      );
      if (!olderPage.messages.length) scrollRestoreRef.current = null;
    } catch (error: any) {
      scrollRestoreRef.current = null;
      toast({
        title: "Couldn't load older messages",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  };

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft("");
    try {
      const message: DmMessageWithSender = await apiRequest(messagesUrl, "POST", { content });
      queryClient.setQueryData<MessagePage<DmMessageWithSender>>(
        [messagesUrl],
        (current) => current
          ? current.messages.some((item) => item.id === message.id)
            ? current
            : { ...current, messages: [...current.messages, message] }
          : { messages: [message], hasMore: false },
      );
      await queryClient.invalidateQueries({ queryKey: ["/api/dms"] });
    } catch (error: any) {
      setDraft((current) => current || content);
      toast({
        title: "Message not sent",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    const result: { added: boolean; reactions: MessageReactionSummary[] } = await apiRequest(
      `${messagesUrl}/${messageId}/reactions`,
      "POST",
      { emoji },
    );
    queryClient.setQueryData<MessagePage<DmMessageWithSender>>(
      [messagesUrl],
      (current) => current
        ? {
            ...current,
            messages: current.messages.map((message) =>
              message.id === messageId ? { ...message, reactions: result.reactions } : message,
            ),
          }
        : current,
    );
  };

  return (
    <>
      <header className="chat-main-header glass-panel flex h-[4.5rem] shrink-0 items-center gap-3 border-x-0 border-t-0 px-4 sm:px-6">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to channels">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
          {conversation.peer.profileImageUrl ? (
            <img src={conversation.peer.profileImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <MessageSquare className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold" style={{ color: conversation.peer.usernameColor }}>
            {peerName}
          </h1>
          <p className="text-xs text-muted-foreground">
            {conversation.peer.customStatus ||
              (conversation.status === "accepted" ? "Direct message" : "Direct message request")}
          </p>
        </div>
      </header>

      {conversation.status === "accepted" ? (
        <>
          <ScrollArea
            ref={messageScrollAreaRef}
            className="min-h-0 flex-1 px-4 py-6 sm:px-8"
            onScrollCapture={(event) => {
              void loadOlderMessages(event.target as HTMLElement);
            }}
          >
            <div className="mx-auto max-w-4xl">
              {loadingOlder && (
                <p className="mb-4 text-center text-xs text-muted-foreground">Loading older messages...</p>
              )}
              {isLoading ? (
                <div className="space-y-4">
                  <div className="h-12 w-2/3 animate-pulse rounded-lg bg-muted" />
                  <div className="ml-auto h-12 w-1/2 animate-pulse rounded-lg bg-muted" />
                </div>
              ) : messages.length ? (
                messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    message={message.content}
                    timestamp={message.createdAt
                      ? new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Now"}
                    isSent={message.senderId === currentUserId}
                    senderName={message.sender.username || message.sender.firstName || "Member"}
                    senderColor={message.sender.usernameColor}
                    avatarUrl={message.sender.profileImageUrl}
                    reactions={message.reactions}
                    onToggleReaction={(emoji) => toggleReaction(message.id, emoji)}
                  />
                ))
              ) : (
                <div className="flex min-h-[45vh] flex-col items-center justify-center text-center">
                  <MessageSquare className="mb-3 h-9 w-9 text-muted-foreground" />
                  <h2 className="font-semibold">This is the start of your conversation</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Send a message to {peerName}.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <form
            className="chat-composer glass-panel flex shrink-0 items-end gap-3 border-x-0 border-b-0 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={`Message ${peerName}`}
              className="glass-control min-h-10 max-h-32 resize-none"
              rows={1}
              maxLength={2000}
              aria-label={`Message ${peerName}`}
            />
            <Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label="Send direct message">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </>
      ) : conversation.isIncoming ? (
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <section className="w-full max-w-md border-y border-border py-7 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold">Message request</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              {peerName} wants to start a direct conversation. Accept to open the chat. Messages stay unavailable until you accept.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button onClick={() => onRespond(true)}>
                <Check className="mr-2 h-4 w-4" />Accept
              </Button>
              <Button variant="outline" onClick={() => onRespond(false)}>
                <X className="mr-2 h-4 w-4" />Decline
              </Button>
            </div>
          </section>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <section className="w-full max-w-md border-y border-border py-7 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Request sent</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              You can send messages once {peerName} accepts your request.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
