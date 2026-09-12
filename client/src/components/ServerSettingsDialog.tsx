import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Crown,
  Hash,
  Pencil,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  UserRound,
  UserRoundX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Channel, User } from "@shared/schema";

export type ServerMember = User & {
  isBanned: boolean;
  banReason: string | null;
};

interface ServerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: Channel[];
  members: ServerMember[];
  actor: User;
}

export default function ServerSettingsDialog({
  open,
  onOpenChange,
  channels,
  members,
  actor,
}: ServerSettingsDialogProps) {
  const [tab, setTab] = useState<"channels" | "members">("channels");
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManageAdmins = actor.isOwner || actor.allowAdminManagement;

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/server"] });

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      await refresh();
      toast({ title: "Updated", description: success });
    } catch (error: any) {
      toast({
        title: "Couldn't update",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const createChannel = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!channelName.trim()) return;
    await run(
      () =>
        apiRequest("/api/channels", "POST", {
          name: channelName.trim(),
          description: channelDescription.trim() || undefined,
        }),
      `#${channelName.trim()} is ready.`,
    );
    setChannelName("");
    setChannelDescription("");
  };

  const saveChannel = async (channelId: string) => {
    await run(
      () =>
        apiRequest(`/api/channels/${channelId}`, "PATCH", {
          name: editingName.trim(),
          description: editingDescription.trim() || undefined,
        }),
      "Channel details saved.",
    );
    setEditingChannel(null);
  };

  const deleteChannel = (channel: Channel) => {
    if (channel.name.toLowerCase() === "general") {
      toast({
        title: "General stays",
        description: "The default general channel cannot be deleted.",
      });
      return;
    }
    if (!window.confirm(`Delete #${channel.name}? Its messages will be removed.`)) return;
    void run(
      () => apiRequest(`/api/channels/${channel.id}`, "DELETE"),
      `#${channel.name} was deleted.`,
    );
  };

  const saveMemberName = async (userId: string) => {
    await run(
      () => apiRequest(`/api/server/members/${userId}/name`, "PATCH", { username: memberName }),
      "Member name changed.",
    );
    setEditingMember(null);
  };

  const toggleAdmin = (member: ServerMember) => {
    void run(
      () =>
        apiRequest(`/api/server/members/${member.id}/admin`, "PATCH", {
          isAdmin: !member.isAdmin,
        }),
      `${member.username || "Member"} is ${member.isAdmin ? "no longer" : "now"} an admin.`,
    );
  };

  const toggleBan = (member: ServerMember) => {
    if (member.isBanned) {
      void run(
        () => apiRequest(`/api/server/members/${member.id}/ban`, "DELETE"),
        `${member.username || "Member"} can access the server again.`,
      );
      return;
    }
    const reason = window.prompt("Optional ban reason:", "") ?? "";
    void run(
      () =>
        apiRequest(`/api/server/members/${member.id}/ban`, "POST", {
          reason: reason.trim() || undefined,
        }),
      `${member.username || "Member"} was banned.`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Server settings
          </DialogTitle>
          <DialogDescription>
            Manage channels, members, and the permissions that keep this community safe.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b border-border">
          <Button
            variant={tab === "channels" ? "secondary" : "ghost"}
            onClick={() => setTab("channels")}
            className="rounded-b-none"
          >
            <Hash className="mr-2 h-4 w-4" /> Channels
          </Button>
          <Button
            variant={tab === "members" ? "secondary" : "ghost"}
            onClick={() => setTab("members")}
            className="rounded-b-none"
          >
            <UserRound className="mr-2 h-4 w-4" /> Members
          </Button>
        </div>

        <ScrollArea className="max-h-[55vh] pr-4">
          {tab === "channels" ? (
            <div className="space-y-5">
              <form onSubmit={createChannel} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div>
                  <h3 className="font-semibold">Create a channel</h3>
                  <p className="text-sm text-muted-foreground">
                    Give your community another focused place to talk.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-1">
                    <Label htmlFor="new-channel-name">Name</Label>
                    <Input
                      id="new-channel-name"
                      placeholder="announcements"
                      value={channelName}
                      onChange={(event) => setChannelName(event.target.value)}
                      maxLength={40}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-channel-description">Description</Label>
                    <Input
                      id="new-channel-description"
                      placeholder="What belongs here?"
                      value={channelDescription}
                      onChange={(event) => setChannelDescription(event.target.value)}
                      maxLength={120}
                    />
                  </div>
                  <Button type="submit" className="self-end" disabled={!channelName.trim()}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
              </form>

              <div className="space-y-2">
                {channels.map((channel) => (
                  <div key={channel.id} className="rounded-lg border border-border p-3">
                    {editingChannel === channel.id ? (
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] items-end">
                        <div className="space-y-1">
                          <Label htmlFor={`edit-channel-${channel.id}`}>Name</Label>
                          <Input
                            id={`edit-channel-${channel.id}`}
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`edit-description-${channel.id}`}>Description</Label>
                          <Input
                            id={`edit-description-${channel.id}`}
                            value={editingDescription}
                            onChange={(event) => setEditingDescription(event.target.value)}
                          />
                        </div>
                        <Button onClick={() => void saveChannel(channel.id)}>Save</Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingChannel(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">#{channel.name}</p>
                          {channel.description && (
                            <p className="text-sm text-muted-foreground truncate">{channel.description}</p>
                          )}
                        </div>
                        {channel.name.toLowerCase() === "general" && <Badge variant="outline">Default</Badge>}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${channel.name}`}
                          onClick={() => {
                            setEditingChannel(channel.id);
                            setEditingName(channel.name);
                            setEditingDescription(channel.description || "");
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${channel.name}`}
                          onClick={() => deleteChannel(channel)}
                          disabled={channel.name.toLowerCase() === "general"}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {actor.isOwner && actor.username?.toLowerCase() === "codecoems" && (
                <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Admin delegation</p>
                    <p className="text-sm text-muted-foreground">
                      Let trusted admins grant or remove admin access for other members.
                    </p>
                  </div>
                  <Switch
                    checked={actor.allowAdminManagement}
                    onCheckedChange={(enabled) =>
                      void run(
                        () => apiRequest("/api/server/admin-delegation", "PATCH", { enabled }),
                        enabled ? "Admins can now manage admin access." : "Only you can manage admin access.",
                      )
                    }
                    aria-label="Allow admins to manage admin access"
                  />
                </div>
              )}

              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        {member.isOwner ? <Crown className="h-4 w-4 text-amber-500" /> : <UserRound className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        {editingMember === member.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={memberName}
                              onChange={(event) => setMemberName(event.target.value)}
                              className="h-8 max-w-48"
                              autoFocus
                            />
                            <Button size="sm" onClick={() => void saveMemberName(member.id)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingMember(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <p className="font-medium truncate">{member.username || member.firstName || "Unnamed member"}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {member.isOwner && <Badge variant="outline">Owner</Badge>}
                          {member.isAdmin && <Badge variant="secondary">Admin</Badge>}
                          {member.isBanned && <Badge variant="destructive">Banned</Badge>}
                        </div>
                      </div>
                      {!member.isOwner && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Change ${member.username || "member"} name`}
                            onClick={() => {
                              setEditingMember(member.id);
                              setMemberName(member.username || "");
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canManageAdmins && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`${member.isAdmin ? "Remove admin from" : "Make"} ${member.username || "member"}`}
                              onClick={() => toggleAdmin(member)}
                            >
                              <Shield className={`h-4 w-4 ${member.isAdmin ? "text-primary" : "text-muted-foreground"}`} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${member.isBanned ? "Unban" : "Ban"} ${member.username || "member"}`}
                            onClick={() => toggleBan(member)}
                          >
                            <UserRoundX className={`h-4 w-4 ${member.isBanned ? "text-primary" : "text-destructive"}`} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}