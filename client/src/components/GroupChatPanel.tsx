import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Camera,
  Menu,
  Send,
  Settings,
  Trash2,
  UserMinus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type {
  DmConversationWithPeer,
  GroupChatMember,
  GroupChatMessageWithSender,
  GroupChatWithMembers,
} from "@shared/schema";
import ChatBubble from "@/components/ChatBubble";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { fileToDataUrl } from "@/lib/fileUploads";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GroupChatPanelProps {
  groupChat: GroupChatWithMembers;
  currentUserId: string;
  acceptedFriends: DmConversationWithPeer[];
  onOpenNavigation: () => void;
  onBack: () => void;
  onDeleted: () => void;
}

export default function GroupChatPanel({
  groupChat,
  currentUserId,
  acceptedFriends,
  onOpenNavigation,
  onBack,
  onDeleted,
}: GroupChatPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(groupChat.name);
  const [savingName, setSavingName] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<GroupChatMember | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesUrl = `/api/group-chats/${groupChat.id}/messages`;
  const { data: messages = [], isLoading, isError, error } = useQuery<GroupChatMessageWithSender[]>({
    queryKey: [messagesUrl],
  });
  const isCreator = groupChat.creatorId === currentUserId;

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

  const cacheUpdatedGroup = (updated: GroupChatWithMembers) => {
    queryClient.setQueryData<GroupChatWithMembers[]>(["/api/group-chats"], (current) =>
      current
        ? current.map((item) => item.id === updated.id ? updated : item)
        : [updated],
    );
  };

  const addMember = async (memberId: string) => {
    if (updatingMemberId) return;
    setUpdatingMemberId(memberId);
    try {
      const updated: GroupChatWithMembers = await apiRequest(
        `/api/group-chats/${groupChat.id}/members`,
        "POST",
        { memberId },
      );
      cacheUpdatedGroup(updated);
      toast({ title: "Member added to group chat" });
    } catch (error: any) {
      toast({
        title: "Couldn't add member",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const removeMember = async () => {
    if (!memberToRemove || updatingMemberId) return;
    setUpdatingMemberId(memberToRemove.id);
    try {
      const response = await apiRequest(
        `/api/group-chats/${groupChat.id}/members/${encodeURIComponent(memberToRemove.id)}`,
        "DELETE",
      );
      const updated: GroupChatWithMembers = await response.json();
      cacheUpdatedGroup(updated);
      setMemberToRemove(null);
      toast({ title: "Member removed from group chat" });
    } catch (error: any) {
      toast({
        title: "Couldn't remove member",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    if (!name || name.length > 60 || savingName) return;
    setSavingName(true);
    try {
      const response = await apiRequest(`/api/group-chats/${groupChat.id}`, "PATCH", { name });
      const updated: GroupChatWithMembers = await response.json();
      cacheUpdatedGroup(updated);
      setSettingsOpen(false);
      toast({ title: "Group name updated" });
    } catch (error: any) {
      toast({
        title: "Couldn't update group name",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingName(false);
    }
  };

  const changePicture = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploadingPicture) return;
    setUploadingPicture(true);
    try {
      const updated: GroupChatWithMembers = await apiRequest(
        `/api/group-chats/${groupChat.id}/avatar`,
        "POST",
        { dataUrl: await fileToDataUrl(file) },
      );
      cacheUpdatedGroup(updated);
      toast({ title: "Group picture updated" });
    } catch (error: any) {
      toast({
        title: "Couldn't update group picture",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPicture(false);
    }
  };

  const deleteGroup = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/group-chats/${groupChat.id}`, "DELETE");
      queryClient.setQueryData<GroupChatWithMembers[]>(["/api/group-chats"], (current) =>
        current?.filter((item) => item.id !== groupChat.id) || [],
      );
      queryClient.removeQueries({ queryKey: [messagesUrl], exact: true });
      setDeleteOpen(false);
      setSettingsOpen(false);
      toast({ title: "Group chat deleted" });
      onDeleted();
    } catch (error: any) {
      toast({
        title: "Couldn't delete group chat",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
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
        <UserAvatar
          name={groupChat.name}
          avatarUrl={groupChat.profileImageUrl || undefined}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{groupChat.name}</h1>
          <p className="text-xs text-muted-foreground">
            {groupChat.members.length} members
          </p>
        </div>
        {isCreator && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setNameDraft(groupChat.name);
              setSettingsOpen(true);
            }}
            aria-label="Group chat settings"
            title="Group chat settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
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
              <UsersRound className="mb-3 h-9 w-9 text-muted-foreground" />
              <h2 className="font-semibold">Couldn't load this group chat</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Refresh the page and try again."}
              </p>
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

      <Dialog
        open={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (open) setNameDraft(groupChat.name);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group chat settings</DialogTitle>
            <DialogDescription>
              Change this group’s name, picture, and members. Only the creator can manage this group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <UserAvatar
                name={groupChat.name}
                avatarUrl={groupChat.profileImageUrl || undefined}
                size="lg"
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(event) => void changePicture(event)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingPicture}
              >
                <Camera className="mr-2 h-4 w-4" />
                {uploadingPicture ? "Uploading..." : "Change picture"}
              </Button>
            </div>
            <div className="space-y-2">
              <label htmlFor="group-chat-name" className="text-sm font-medium">Group name</label>
              <Input
                id="group-chat-name"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={60}
                disabled={savingName}
              />
            </div>
          </div>
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Members ({groupChat.members.length}/21)</p>
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {groupChat.members.map((member) => {
                const memberName = member.nickname || member.username || "Member";
                const isGroupCreator = member.id === groupChat.creatorId;
                return (
                  <div key={member.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                    <UserAvatar
                      name={memberName}
                      avatarUrl={member.profileImageUrl || undefined}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{memberName}</span>
                    {isGroupCreator ? (
                      <span className="text-xs text-muted-foreground">Creator</span>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${memberName}`}
                        title={`Remove ${memberName}`}
                        disabled={updatingMemberId !== null}
                        onClick={() => setMemberToRemove(member)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Add accepted friends</p>
              {acceptedFriends
                .filter((friend) =>
                  !groupChat.members.some((member) => member.id === friend.peer.id),
                )
                .map((friend) => {
                  const friendName = friend.peer.nickname || friend.peer.username || "Member";
                  return (
                    <div key={friend.peer.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                      <UserAvatar
                        name={friendName}
                        avatarUrl={friend.peer.profileImageUrl || undefined}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{friendName}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          updatingMemberId !== null ||
                          groupChat.members.length >= 21
                        }
                        onClick={() => void addMember(friend.peer.id)}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  );
                })}
              {!acceptedFriends.some((friend) =>
                !groupChat.members.some((member) => member.id === friend.peer.id),
              ) && (
                <p className="px-2 py-2 text-sm text-muted-foreground">
                  {acceptedFriends.length
                    ? "All your accepted friends are already in this group."
                    : "You don't have any accepted friends to add."}
                </p>
              )}
              {groupChat.members.length >= 21 && (
                <p className="px-2 text-xs text-muted-foreground">
                  This group has reached its member limit.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSettingsOpen(false)}
              disabled={savingName || updatingMemberId !== null}
            >
              Close
            </Button>
            <Button
              onClick={() => void saveName()}
              disabled={!nameDraft.trim() || nameDraft.trim() === groupChat.name || savingName}
            >
              {savingName ? "Saving..." : "Save name"}
            </Button>
          </DialogFooter>
          <div className="border-t pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={deleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete group chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (!open && updatingMemberId === null) setMemberToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this member?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove
                ? `${memberToRemove.nickname || memberToRemove.username || "This member"} will lose access to this group chat.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingMemberId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={updatingMemberId !== null}
              onClick={(event) => {
                event.preventDefault();
                void removeMember();
              }}
            >
              {updatingMemberId ? "Removing..." : "Remove member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the group and its messages for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteGroup();
              }}
            >
              {deleting ? "Deleting..." : "Delete group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
