import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Hash,
  ClipboardCheck,
  Megaphone,
  LockKeyhole,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Wifi,
  Camera,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getSocket } from "@/lib/socket";
import { fileToDataUrl, MAX_AVATAR_BYTES } from "@/lib/fileUploads";
import type {
  Channel,
  MessageReplyPreview,
  Server,
  ServerMessageWithRelations,
  User,
} from "@shared/schema";
import ChatBubble from "@/components/ChatBubble";
import MessageInput, {
  type GifResult,
  type MentionMember,
} from "@/components/MessageInput";
import UserAvatar from "@/components/UserAvatar";
import AvatarCropDialog from "@/components/AvatarCropDialog";
import ThemeToggle from "@/components/ThemeToggle";
import UsernameSetup from "@/components/UsernameSetup";
import ServerSettingsDialog, {
  type ServerMember,
} from "@/components/ServerSettingsDialog";

interface ServerData {
  server: Server;
  channels: Channel[];
  members: ServerMember[];
}

const ADMIN_ONLY_CHANNELS = new Set(["rules", "announcements"]);

function isAdminOnlyChannel(channelName: string) {
  return ADMIN_ONLY_CHANNELS.has(channelName.trim().toLowerCase());
}

function isRulesChannel(channelName: string) {
  return channelName.trim().toLowerCase() === "rules";
}

function isAnnouncementsChannel(channelName: string) {
  return channelName.trim().toLowerCase() === "announcements";
}

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const [avatarCropSource, setAvatarCropSource] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(true);
  const [replyingTo, setReplyingTo] = useState<MessageReplyPreview | null>(null);
  const [unreadMentionChannelIds, setUnreadMentionChannelIds] = useState<Set<string>>(
    () => new Set(),
  );
  const selectedChannelRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: serverData, isLoading: serverLoading } = useQuery<ServerData>({
    queryKey: ["/api/server"],
    enabled: !!user,
  });
  const channels = serverData?.channels || [];
  const members = serverData?.members || [];
  const currentMember = user ? members.find((member) => member.id === user.id) : undefined;
  const currentStatus = currentMember?.status || user?.status || "offline";
  const orderedChannels = useMemo(() => {
    const displayOrder = new Map([
      ["rules", 0],
      ["announcements", 1],
      ["general", 2],
    ]);
    return [...channels].sort((a, b) => {
      const aOrder = displayOrder.get(a.name.trim().toLowerCase()) ?? 3;
      const bOrder = displayOrder.get(b.name.trim().toLowerCase()) ?? 3;
      return aOrder - bOrder || a.position - b.position;
    });
  }, [channels]);
  const defaultChannel =
    channels.find((channel) => channel.name.trim().toLowerCase() === "general") || channels[0];
  const activeChannelId = selectedChannelId || defaultChannel?.id || null;
  const activeChannel = channels.find((channel) => channel.id === activeChannelId);
  const adminOnlyChannel = !!activeChannel && isAdminOnlyChannel(activeChannel.name);
  const canSendMessages = !!user && (!adminOnlyChannel || user.isAdmin);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ServerMessageWithRelations[]>({
    queryKey: activeChannelId
      ? [`/api/channels/${activeChannelId}/messages`]
      : ["/api/channels/none/messages"],
    enabled: !!activeChannelId,
  });

  useEffect(() => {
    if (channels.length && (!selectedChannelId || !channels.some((channel) => channel.id === selectedChannelId))) {
       setSelectedChannelId(defaultChannel?.id || null);
    }
  }, [channels, defaultChannel?.id, selectedChannelId]);

  useEffect(() => {
    selectedChannelRef.current = activeChannelId;
    setTypingUsers(new Set());
    setReplyingTo(null);
    if (activeChannelId) {
      setUnreadMentionChannelIds((previous) => {
        if (!previous.has(activeChannelId)) return previous;
        const next = new Set(previous);
        next.delete(activeChannelId);
        return next;
      });
    }
  }, [activeChannelId]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ahs-chat-unread-mentions") || "[]");
      if (Array.isArray(saved)) setUnreadMentionChannelIds(new Set(saved.filter((id) => typeof id === "string")));
    } catch {
      setUnreadMentionChannelIds(new Set());
    }
  }, [user?.id]);

  useEffect(() => {
    localStorage.setItem(
      "ahs-chat-unread-mentions",
      JSON.stringify(Array.from(unreadMentionChannelIds)),
    );
  }, [unreadMentionChannelIds]);

  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket();
    socket.connect();
    socket.emit("user:connect", user.id);

    const handleMessageReceive = (message: ServerMessageWithRelations) => {
      if (
        message.mentionUserIds.includes(user.id) &&
        message.channelId !== selectedChannelRef.current
      ) {
        setUnreadMentionChannelIds((previous) => new Set(previous).add(message.channelId));
      }
      if (message.channelId !== selectedChannelRef.current) return;
      queryClient.setQueryData<ServerMessageWithRelations[]>(
        [`/api/channels/${message.channelId}/messages`],
        (old = []) => (old.some((item) => item.id === message.id) ? old : [...old, message]),
      );
    };
    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      queryClient.setQueryData<ServerMessageWithRelations[]>(
        [`/api/channels/${selectedChannelRef.current}/messages`],
        (old = []) => old.filter((message) => message.id !== messageId),
      );
    };
    const handleMentionReceived = ({ channelId }: { channelId: string }) => {
      if (channelId === selectedChannelRef.current) return;
      setUnreadMentionChannelIds((previous) => new Set(previous).add(channelId));
    };
    const handleTyping = ({
      userId,
      channelId,
      typing,
    }: {
      userId: string;
      channelId: string;
      typing: boolean;
    }) => {
      if (channelId !== selectedChannelRef.current || userId === user.id) return;
      setTypingUsers((previous) => {
        const next = new Set(previous);
        if (typing) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };
    const invalidateServer = () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/server"] });
    };
    const handleMemberUpdated = (payload: Partial<User> & { userId?: string }) => {
      invalidateServer();
      if (payload.id === user.id || payload.userId === user.id) {
        void queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    };
    const handleBanned = () => {
      toast({
        title: "You were banned",
        description: "You no longer have access to this server.",
        variant: "destructive",
      });
      socket.disconnect();
      setTimeout(() => {
        window.location.href = "/api/logout";
      }, 700);
    };
    const handleMessageError = ({ error }: { error: string }) => {
      toast({
        title: "Message not sent",
        description: error,
        variant: "destructive",
      });
    };

    socket.on("message:receive", handleMessageReceive);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("mention:received", handleMentionReceived);
    socket.on("message:error", handleMessageError);
    socket.on("member:typing", handleTyping);
    socket.on("member:status", invalidateServer);
    socket.on("member:updated", handleMemberUpdated);
    socket.on("channel:created", invalidateServer);
    socket.on("channel:updated", invalidateServer);
    socket.on("channel:deleted", invalidateServer);
    socket.on("server:banned", handleBanned);

    return () => {
      socket.off("message:receive", handleMessageReceive);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("mention:received", handleMentionReceived);
      socket.off("message:error", handleMessageError);
      socket.off("member:typing", handleTyping);
      socket.off("member:status", invalidateServer);
      socket.off("member:updated", handleMemberUpdated);
      socket.off("channel:created", invalidateServer);
      socket.off("channel:updated", invalidateServer);
      socket.off("channel:deleted", invalidateServer);
      socket.off("server:banned", handleBanned);
      socket.disconnect();
    };
  }, [user?.id, queryClient, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChannelId]);

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => apiRequest(`/api/messages/${messageId}`, "DELETE"),
    onSuccess: (_, messageId) => {
      queryClient.setQueryData<ServerMessageWithRelations[]>(
        [`/api/channels/${activeChannelId}/messages`],
        (old = []) => old.filter((message) => message.id !== messageId),
      );
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't delete message",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      toast({
        title: "Profile picture is too large",
        description: "Profile pictures must be smaller than 3 MB.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }
    try {
      setAvatarCropSource(await fileToDataUrl(file));
      setAvatarCropOpen(true);
    } catch (error: any) {
      toast({
        title: "Couldn't open profile picture",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleAvatarCropConfirm = async (croppedImage: string) => {
    try {
      setAvatarUploading(true);
      const updatedUser = await apiRequest("/api/profile/avatar", "POST", {
        dataUrl: croppedImage,
      });
      queryClient.setQueryData(["/api/auth/user"], updatedUser);
      await queryClient.invalidateQueries({ queryKey: ["/api/server"] });
      setAvatarCropSource(null);
      toast({ title: "Profile picture updated" });
    } catch (error: any) {
      toast({
        title: "Couldn't update profile picture",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSendMessage = async (
    content: string,
    file?: File,
    replyToId?: string,
    mentionUserIds: string[] = [],
  ) => {
    if (!activeChannelId || !canSendMessages) return;
    try {
      let attachment;
      if (file) {
        setAttachmentUploading(true);
        const uploaded = await apiRequest("/api/uploads", "POST", {
          dataUrl: await fileToDataUrl(file),
          fileName: file.name,
        });
        attachment = {
          attachmentUrl: uploaded.url,
          attachmentName: uploaded.originalName,
          attachmentMimeType: uploaded.mimeType,
          attachmentSize: uploaded.size,
        };
      }
      getSocket().emit("message:send", {
        channelId: activeChannelId,
        content,
        replyToId,
        mentionUserIds,
        ...attachment,
      });
      setReplyingTo(null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      getSocket().emit("typing:stop", { channelId: activeChannelId });
    } catch (error: any) {
      toast({
        title: "Couldn't send file",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      if (file) setAttachmentUploading(false);
    }
  };

  const handleSendGif = async (
    gif: GifResult,
    content: string,
    replyToId?: string,
    mentionUserIds: string[] = [],
  ) => {
    if (!activeChannelId || !canSendMessages) return;
    try {
      setAttachmentUploading(true);
      const uploaded = await apiRequest("/api/gifs/import", "POST", {
        url: gif.url,
        fileName: "tenor-gif.gif",
      });
      getSocket().emit("message:send", {
        channelId: activeChannelId,
        content,
        replyToId,
        mentionUserIds,
        attachmentUrl: uploaded.url,
        attachmentName: uploaded.originalName,
        attachmentMimeType: uploaded.mimeType,
        attachmentSize: uploaded.size,
      });
      setReplyingTo(null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      getSocket().emit("typing:stop", { channelId: activeChannelId });
    } catch (error: any) {
      toast({
        title: "Couldn't send GIF",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setAttachmentUploading(false);
    }
  };

  const handleTyping = () => {
    if (!activeChannelId || !canSendMessages) return;
    const socket = getSocket();
    socket.emit("typing:start", { channelId: activeChannelId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing:stop", { channelId: activeChannelId });
    }, 2000);
  };

  const filteredMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          !member.isBanned &&
          (member.username || member.firstName || "")
            .toLowerCase()
            .includes(memberSearch.toLowerCase()),
      ),
    [members, memberSearch],
  );
  const typingNames = members
    .filter((member) => typingUsers.has(member.id))
    .map((member) => member.username || member.firstName || "Someone");
  const mentionableMembers: MentionMember[] = members
    .filter((member) => !member.isBanned)
    .map((member) => ({
      id: member.id,
      username: member.username,
      firstName: member.firstName,
    }));
  const visibleMessages = messages
    .map((message) => ({ ...message, content: message.content.trim() }))
    .filter(
      (message) =>
        message.content.replace(/[\s\u200B-\u200D\uFEFF]/g, "").length > 0 ||
        Boolean(message.attachmentUrl),
    );

  if (authLoading || serverLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your server...</p>
        </div>
      </div>
    );
  }

  if (!user || !serverData) return null;

  return (
    <>
      {!user.username && (
        <UsernameSetup
          open
          onComplete={() => void queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] })}
        />
      )}
      <AvatarCropDialog
        open={avatarCropOpen}
        imageSrc={avatarCropSource}
        onOpenChange={(open) => {
          setAvatarCropOpen(open);
          if (!open) setAvatarCropSource(null);
        }}
        onConfirm={handleAvatarCropConfirm}
      />
      <ServerSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        channels={channels}
        members={members}
        actor={members.find((member) => member.id === user.id) || user}
      />

      <div className="app-shell flex h-dvh min-h-0 overflow-hidden">
        <aside className="glass-panel flex min-h-0 w-[280px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar/55">
          <div className="flex items-center gap-3 border-b border-sidebar-border p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">AHS Chat</p>
              <p className="text-xs text-sidebar-foreground/60">Community server</p>
            </div>
            {user.isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                aria-label="Open server settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <ThemeToggle />
          </div>

          <div className="border-b border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
                data-testid="input-avatar"
              />
              <button
                type="button"
                className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label="Change profile picture"
              >
                <UserAvatar
                  name={user.username || user.firstName || "User"}
                  avatarUrl={user.profileImageUrl || undefined}
                  size="md"
                  showOnlineStatus
                  isOnline={currentStatus === "online"}
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-4 w-4" />
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.username || user.firstName || "User"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.isOwner ? "Owner" : user.isAdmin ? "Admin" : "Member"}
                </p>
              </div>
              <Button variant="ghost" size="icon" asChild aria-label="Log out">
                <a href="/api/logout"><LogOut className="h-4 w-4" /></a>
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  currentStatus === "online" ? "bg-status-online" : "bg-status-offline"
                }`}
              />
              <span>{currentStatus === "online" ? "Online" : "Offline"}</span>
            </div>
          </div>

          <div className="px-4 pb-2 pt-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Text channels</span>
              {user.isAdmin && (
                <button
                  type="button"
                  className="rounded p-1 hover:bg-sidebar-accent"
                  onClick={() => setSettingsOpen(true)}
                  aria-label="Add channel"
                >
                  +
                </button>
              )}
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1 px-2">
            <div className="space-y-1">
              {orderedChannels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setSelectedChannelId(channel.id)}
                  className={`flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm transition-colors ${
                    activeChannelId === channel.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                    {isRulesChannel(channel.name) ? (
                      <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                    ) : isAnnouncementsChannel(channel.name) ? (
                      <Megaphone className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Hash className="h-4 w-4" />
                    )}
                    {isAdminOnlyChannel(channel.name) && (
                      <LockKeyhole
                        className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-sidebar text-status-busy"
                        aria-label="Admins only"
                      />
                    )}
                  </span>
                  <span className="truncate">{channel.name}</span>
                  {unreadMentionChannelIds.has(channel.id) && (
                    <span
                      className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground"
                      aria-label="You were mentioned in this channel"
                    >
                      1
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
          <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Wifi className="h-3.5 w-3.5 text-status-online" />
              <span>Real-time community chat</span>
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {activeChannel ? (
            <>
              <header className="glass-panel flex h-16 shrink-0 items-center gap-3 border-x-0 border-t-0 px-6">
                <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                  {isRulesChannel(activeChannel.name) ? (
                    <ClipboardCheck
                      className="h-5 w-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : isAnnouncementsChannel(activeChannel.name) ? (
                    <Megaphone className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <Hash className="h-5 w-5 text-muted-foreground" />
                  )}
                  {adminOnlyChannel && (
                    <LockKeyhole
                      className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-background text-status-busy"
                      aria-label="Admins only"
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="font-semibold">{activeChannel.name}</h1>
                    {adminOnlyChannel && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-status-busy">
                        <LockKeyhole className="h-3 w-3" />
                        Admins only
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {activeChannel.description || "A place for the community to talk"}
                  </p>
                </div>
                <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
                  <Users className="h-4 w-4" />
                  {members.filter((member) => !member.isBanned).length}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:inline-flex"
                  onClick={() => setMembersOpen((open) => !open)}
                  aria-label={membersOpen ? "Hide member list" : "Show member list"}
                  title={membersOpen ? "Hide member list" : "Show member list"}
                >
                  <Users className="h-4 w-4" />
                </Button>
              </header>

              <ScrollArea className="min-h-0 flex-1 px-4 py-6 sm:px-8">
                <div className="mx-auto max-w-4xl">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      <div className="h-12 w-2/3 animate-pulse rounded-lg bg-muted" />
                      <div className="ml-auto h-12 w-1/2 animate-pulse rounded-lg bg-muted" />
                    </div>
                  ) : visibleMessages.length === 0 ? (
                    <div className="flex min-h-[45vh] flex-col items-center justify-center text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                        <Hash className="h-8 w-8 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold">Welcome to #{activeChannel.name}</h2>
                      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        This is the start of the channel. Send the first message to get things moving.
                      </p>
                    </div>
                  ) : (
                    visibleMessages.map((message) => {
                      const sender = members.find((member) => member.id === message.senderId);
                      const senderName = sender?.username || sender?.firstName || "Member";
                      const attachment =
                        message.attachmentUrl &&
                        message.attachmentName &&
                        message.attachmentMimeType &&
                        message.attachmentSize
                          ? {
                              url: message.attachmentUrl,
                              name: message.attachmentName,
                              mimeType: message.attachmentMimeType,
                              size: message.attachmentSize,
                            }
                          : undefined;
                      return (
                        <ChatBubble
                          key={message.id}
                          message={message.content}
                          timestamp={
                            message.createdAt
                              ? new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Now"
                          }
                          isSent={message.senderId === user.id}
                          senderName={senderName}
                          avatarUrl={sender?.profileImageUrl}
                          isMentionedUser={message.mentionUserIds.includes(user.id)}
                          attachment={attachment}
                          mentionNames={message.mentionUserIds
                            .map((mentionId) => {
                              const mentionedMember = members.find((member) => member.id === mentionId);
                              return mentionedMember?.username || mentionedMember?.firstName || "";
                            })
                            .filter(Boolean)}
                          reply={message.reply}
                          onReply={() =>
                            setReplyingTo(
                              message.reply || {
                                id: message.id,
                                content: message.content,
                                senderId: message.senderId,
                                senderName,
                              },
                            )
                          }
                          canDelete={user.isAdmin}
                          onDelete={() => deleteMessageMutation.mutate(message.id)}
                        />
                      );
                    })
                  )}
                  {typingNames.length > 0 && (
                    <div className="mb-4 text-sm italic text-muted-foreground">
                      {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              {canSendMessages ? (
                <div onKeyDown={handleTyping}>
                  <MessageInput
                    placeholder={`Message #${activeChannel.name}`}
                    onSendMessage={handleSendMessage}
                    onSendGif={handleSendGif}
                    isUploading={attachmentUploading}
                    mentionableMembers={mentionableMembers}
                    replyTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    onFileError={(message) =>
                      toast({
                        title: "File not attached",
                        description: message,
                        variant: "destructive",
                      })
                    }
                  />
                </div>
              ) : (
                <div className="border-t border-border bg-muted/30 px-4 py-4 text-center text-sm text-muted-foreground">
                  Only admins can post in #{activeChannel.name}.
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center">
              <div>
                <Hash className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <h2 className="text-lg font-semibold">No channels yet</h2>
                <p className="text-sm text-muted-foreground">An admin can create a channel from Server settings.</p>
              </div>
            </div>
          )}
        </main>

        <aside
          className={`glass-panel ${
            membersOpen ? "hidden lg:flex" : "hidden"
          } min-h-0 w-64 shrink-0 border-y-0 border-r-0 border-l border-border/60 p-4 lg:flex-col`}
        >
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Members</h2>
            <Badge variant="secondary" className="ml-auto">
              {members.filter((member) => !member.isBanned).length}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMembersOpen(false)}
              aria-label="Hide member list"
              title="Hide member list"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Find a member"
              className="pl-9"
              aria-label="Find a member"
            />
          </div>
            <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1">
              {filteredMembers.map((member) => (
                <div key={member.id} className={`flex items-center gap-2 rounded-md px-2 py-2 ${member.isBanned ? "opacity-50" : ""}`}>
                  <UserAvatar
                    name={member.username || member.firstName || "Member"}
                    avatarUrl={member.profileImageUrl || undefined}
                    size="sm"
                    showOnlineStatus
                    isOnline={member.status === "online" && !member.isBanned}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{member.username || member.firstName || "Member"}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.isOwner ? "Owner" : member.isAdmin ? "Admin" : member.isBanned ? "Banned" : "Member"}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          member.status === "online" && !member.isBanned
                            ? "bg-status-online"
                            : "bg-status-offline"
                        }`}
                      />
                      {member.status === "online" && !member.isBanned ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </>
  );
}