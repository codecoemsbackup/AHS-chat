import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Menu, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { TitanBotMessage } from "@shared/schema";
import ChatBubble from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import "katex/dist/katex.min.css";

function normalizeMathDelimiters(content: string) {
  return content
    .replace(/\\\[([\s\S]+?)\\\]/g, (_match, formula: string) => `$$\n${formula}\n$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_match, formula: string) => `$${formula}$`);
}

interface TitanBotPanelProps {
  currentUserName: string;
  onOpenNavigation: () => void;
  onBack: () => void;
}

export default function TitanBotPanel({
  currentUserName,
  onOpenNavigation,
  onBack,
}: TitanBotPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const queryKey = ["/api/titan-bot/messages"];
  const { data: messages = [], isLoading, isError, error } = useQuery<TitanBotMessage[]>({
    queryKey,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const result: { userMessage: TitanBotMessage; botMessage: TitanBotMessage } =
        await apiRequest("/api/titan-bot/messages", "POST", { content });
      queryClient.setQueryData<TitanBotMessage[]>(queryKey, (current) => [
        ...(current || []),
        result.userMessage,
        result.botMessage,
      ]);
      setDraft("");
    } catch (error: any) {
      void queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Titan Bot couldn't reply",
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
        <img
          src="/titan-bot.svg"
          alt=""
          className="h-9 w-9 shrink-0 rounded-full"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold text-primary">Titan Bot</h1>
          <p className="text-xs text-muted-foreground">AI assistant</p>
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-4xl">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-12 w-2/3 animate-pulse rounded-lg bg-muted" />
              <div className="ml-auto h-12 w-1/2 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : isError ? (
            <div className="flex min-h-[45vh] flex-col items-center justify-center text-center">
              <img src="/titan-bot.svg" alt="" className="mb-3 h-9 w-9 rounded-full" />
              <h2 className="font-semibold">Couldn't load Titan Bot</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Refresh the page and try again."}
              </p>
            </div>
          ) : messages.length ? (
            messages.map((message) => (
              <div key={message.id} data-message-id={message.id}>
                <ChatBubble
                  message={message.content}
                  messageContent={
                    message.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none break-words dark:prose-invert [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:my-1 [&_ol]:my-1">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
                        >
                          {normalizeMathDelimiters(message.content)}
                        </ReactMarkdown>
                      </div>
                    ) : undefined
                  }
                  timestamp={new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  isSent={message.role === "user"}
                  senderName={message.role === "user" ? currentUserName : "Titan Bot"}
                  senderColor={message.role === "assistant" ? "hsl(var(--primary))" : undefined}
                  avatarUrl={message.role === "assistant" ? "/titan-bot.svg" : undefined}
                />
              </div>
            ))
          ) : (
            <div className="flex min-h-[45vh] flex-col items-center justify-center text-center">
              <img src="/titan-bot.svg" alt="" className="mb-3 h-12 w-12 rounded-full" />
              <h2 className="font-semibold">Hey, I’m Titan Bot</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask me a question or just say hi.
              </p>
            </div>
          )}
          <div ref={endRef} />
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Replies are generated by Groq. Don’t share passwords or private information.
          </p>
        </div>
      </ScrollArea>

      <form
        className="flex items-center gap-2 border-t border-border p-3 sm:px-6"
        onSubmit={(event) => void sendMessage(event)}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message Titan Bot"
          maxLength={2000}
          aria-label="Message Titan Bot"
          disabled={sending}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!draft.trim() || sending}
          aria-label="Send message to Titan Bot"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
}
