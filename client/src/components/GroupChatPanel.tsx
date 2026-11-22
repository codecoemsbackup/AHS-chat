import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Menu, Send, UsersRound } from "lucide-react";
import type {
  GroupChatMessageWithSender,
  GroupChatWithMembers,
} from "@shared/schema";
import ChatBubble from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GroupChatPanelProps {
  groupChat: GroupChatWithMembers;
  currentUserId: string;
  onOpenNavigation: () => void;
  onBack: () => void;
}

export default function GroupChatPanel({
  groupChat,
  currentUserId,
  onOpenNavigation,
  onBack,
}: GroupChatPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesUrl = `/api/group-chats/${groupChat.id}/messages`;
  const { data: messages = [], isLoading } = useQuery<GroupChatMessageWithSender[]>({
    queryKey: [messagesUrl],
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupChat.id, messages.length]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const message: GroupChatMessageWithSender = await apiRequest(messagesUrl, "POST", {
        content,
      });
      queryClient.setQueryData<GroupChatMessageWithSender[]>([messagesUrl], (current) =>
        current?.some((item) => item.id === message.id)
          ? current
          : [...(current || []), message],
      );
      setDraft("");
    } catch (error: any) {
      toast({
        title: "Message not sent",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <header className="chat-main-header glass-panel flex h-[4.5rem] shrink-0 items-center gap-2 border-x-0 border-t-0 px-3 sm:gap-3 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={onOpenNavigation}
          aria-label="Open chats and channels"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to channels">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <UsersRound className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{groupChat.name}</h1>
          <p className="text-xs text-muted-foreground">
            {groupChat.members.length} members
          </p>
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-4xl">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-12 w-2/3 animate-pulse rounded-lg bg-muted" />
              <div className="ml-auto h-12 w-1/2 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : messages.length ? (
            messages.map((message) => (
              <div key={message.id} data-message-id={message.id}>
                <ChatBubble
                  message={message.content}
                  timestamp={message.createdAt
                    ? new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Now"}
                  isSent={message.senderId === currentUserId}
                  senderName={message.sender.nickname || message.sender.username || "Member"}
                  senderColor={message.sender.usernameColor}
                  avatarUrl={message.sender.profileImageUrl}
                />
              </div>
            ))
          ) : (
            <div className="flex min-h-[45vh] flex-col items-center justify-center text-center">
              <UsersRound className="mb-3 h-9 w-9 text-muted-foreground" />
              <h2 className="font-semibold">This is the start of your group chat</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Send the first message to {groupChat.name}.
              </p>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <form
        className="flex items-center gap-2 border-t border-border p-3 sm:px-6"
        onSubmit={(event) => void sendMessage(event)}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${groupChat.name}`}
          maxLength={2000}
          aria-label={`Message ${groupChat.name}`}
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
}
