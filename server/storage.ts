import {
  users,
  servers,
  channels,
  serverMessages,
  dmConversations,
  dmMessages,
  bannedUsers,
  type User,
  type UpsertUser,
  type Server,
  type Channel,
  type ServerMessage,
  type ServerMessageWithRelations,
  type MessageReplyPreview,
  type InsertServerMessage,
  type DmConversation,
  type DmConversationWithPeer,
  type DmMessageWithSender,
} from "@shared/schema";
import { db } from "./db";
import { and, asc, desc, eq, sql } from "drizzle-orm";

export const MAIN_SERVER_ID = "main";
export const DEFAULT_CHANNEL_NAME = "general";

export type ServerMember = User & { isBanned: boolean; banReason: string | null };

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createLocalUser(username: string, passwordHash: string): Promise<User>;
  updateUserStatus(userId: string, status: string): Promise<void>;
  updateUsername(userId: string, username: string): Promise<User>;
  updateProfileImage(userId: string, profileImageUrl: string): Promise<User>;

  ensureServer(): Promise<Server>;
  getChannels(): Promise<Channel[]>;
  getChannel(channelId: string): Promise<Channel | undefined>;
  createChannel(name: string, description?: string): Promise<Channel>;
  updateChannel(channelId: string, name: string, description?: string): Promise<Channel>;
  deleteChannel(channelId: string): Promise<void>;

  getMembers(): Promise<ServerMember[]>;
  updateAdmin(userId: string, isAdmin: boolean): Promise<User>;
  updateAdminDelegation(userId: string, enabled: boolean): Promise<User>;
  banUser(userId: string, bannedBy: string, reason?: string): Promise<void>;
  unbanUser(userId: string): Promise<void>;
  isUserBanned(userId: string): Promise<boolean>;

  getChannelMessages(channelId: string, limit?: number): Promise<ServerMessageWithRelations[]>;
  createMessage(message: InsertServerMessage & { senderId: string }): Promise<ServerMessageWithRelations>;
  deleteMessage(messageId: string, deletedBy: string): Promise<void>;

  getDmConversations(userId: string): Promise<DmConversationWithPeer[]>;
  getDmConversation(conversationId: string, userId: string): Promise<DmConversationWithPeer | undefined>;
  createDmConversation(requesterId: string, peerId: string): Promise<DmConversationWithPeer>;
  respondToDmRequest(conversationId: string, userId: string, accepted: boolean): Promise<DmConversation | undefined>;
  getDmMessages(conversationId: string, limit?: number): Promise<DmMessageWithSender[]>;
  createDmMessage(conversationId: string, senderId: string, content: string): Promise<DmMessageWithSender>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ ...userData, isOwner: false })
      .onConflictDoUpdate({
        target: users.id,
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`);
    return user;
  }

  async createLocalUser(username: string, passwordHash: string): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ username, passwordHash })
      .returning();
    await this.ensureServer();
    return user;
  }

  async updateUserStatus(userId: string, status: string): Promise<void> {
    await db
      .update(users)
      .set({ status, lastSeen: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUsername(userId: string, username: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ username, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    await this.claimOwnerIfNeeded();
    return user;
  }

  async updateProfileImage(userId: string, profileImageUrl: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ profileImageUrl, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  private async claimOwnerIfNeeded(): Promise<void> {
    await db
      .update(users)
      .set({
        isOwner: sql`coalesce(lower(${users.username}), '') = 'codecoems'`,
        updatedAt: new Date(),
      });
    await db
      .update(users)
      .set({ isAdmin: true, updatedAt: new Date() })
      .where(sql`lower(${users.username}) = 'codecoems'`);
  }

  async ensureServer(): Promise<Server> {
    await db
      .insert(servers)
      .values({
        id: MAIN_SERVER_ID,
        name: "AHS Chat",
        description: "One community. Every conversation in one place.",
      })
      .onConflictDoNothing();

    const [general] = await db
      .select({ id: channels.id })
      .from(channels)
      .where(sql`${channels.serverId} = ${MAIN_SERVER_ID} AND lower(${channels.name}) = 'general'`)
      .limit(1);
    if (!general) {
      await db.insert(channels).values({
        serverId: MAIN_SERVER_ID,
        name: DEFAULT_CHANNEL_NAME,
        description: "The place where everyone can talk.",
        position: 0,
      });
    }
    await this.claimOwnerIfNeeded();
    const [server] = await db.select().from(servers).where(eq(servers.id, MAIN_SERVER_ID));
    return server;
  }

  async getChannels(): Promise<Channel[]> {
    await this.ensureServer();
    return db
      .select()
      .from(channels)
      .where(eq(channels.serverId, MAIN_SERVER_ID))
      .orderBy(asc(channels.position), asc(channels.createdAt));
  }

  async getChannel(channelId: string): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, channelId));
    return channel;
  }

  async createChannel(name: string, description?: string): Promise<Channel> {
    const existing = await db
      .select({ position: channels.position })
      .from(channels)
      .where(eq(channels.serverId, MAIN_SERVER_ID))
      .orderBy(desc(channels.position))
      .limit(1);
    const [channel] = await db
      .insert(channels)
      .values({
        serverId: MAIN_SERVER_ID,
        name,
        description: description || null,
        position: (existing[0]?.position ?? -1) + 1,
      })
      .returning();
    return channel;
  }

  async updateChannel(channelId: string, name: string, description?: string): Promise<Channel> {
    const [channel] = await db
      .update(channels)
      .set({ name, description: description || null, updatedAt: new Date() })
      .where(eq(channels.id, channelId))
      .returning();
    return channel;
  }

  async deleteChannel(channelId: string): Promise<void> {
    const channel = await this.getChannel(channelId);
    if (!channel) throw new Error("Channel not found");
    if (channel.name.toLowerCase() === DEFAULT_CHANNEL_NAME) {
      throw new Error("The general channel cannot be deleted");
    }
    await db.delete(channels).where(eq(channels.id, channelId));
  }

  async getMembers(): Promise<ServerMember[]> {
    const rows = await db
      .select({ user: users, ban: bannedUsers })
      .from(users)
      .leftJoin(bannedUsers, eq(users.id, bannedUsers.userId))
      .orderBy(asc(users.username), asc(users.createdAt));
    return rows.map(({ user, ban }) => ({
      ...user,
      isBanned: !!ban,
      banReason: ban?.reason ?? null,
    }));
  }

  async updateAdmin(userId: string, isAdmin: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isAdmin, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateAdminDelegation(userId: string, enabled: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ allowAdminManagement: enabled, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async banUser(userId: string, bannedBy: string, reason?: string): Promise<void> {
    await db
      .insert(bannedUsers)
      .values({ userId, bannedBy, reason: reason || null })
      .onConflictDoUpdate({
        target: bannedUsers.userId,
        set: { bannedBy, reason: reason || null, createdAt: new Date() },
      });
  }

  async unbanUser(userId: string): Promise<void> {
    await db.delete(bannedUsers).where(eq(bannedUsers.userId, userId));
  }

  async isUserBanned(userId: string): Promise<boolean> {
    const [ban] = await db
      .select({ id: bannedUsers.id })
      .from(bannedUsers)
      .where(eq(bannedUsers.userId, userId));
    return !!ban;
  }

  async getChannelMessages(channelId: string, limit = 100): Promise<ServerMessageWithRelations[]> {
    const messages = await db
      .select()
      .from(serverMessages)
      .where(
        sql`${serverMessages.channelId} = ${channelId}
          AND ${serverMessages.deletedAt} IS NULL
            AND (
              btrim(${serverMessages.content}) <> ''
              OR ${serverMessages.attachmentUrl} IS NOT NULL
            )`,
      )
      .orderBy(desc(serverMessages.createdAt))
      .limit(limit);
    const visibleMessages = messages
      .filter(
        (message) =>
          message.content.replace(/[\s\u200B-\u200D\uFEFF]/g, "").length > 0 ||
          Boolean(message.attachmentUrl),
      )
      .reverse();
    return Promise.all(visibleMessages.map((message) => this.withReplyPreview(message)));
  }

  async createMessage(
    message: InsertServerMessage & { senderId: string },
  ): Promise<ServerMessageWithRelations> {
    const [newMessage] = await db.insert(serverMessages).values(message).returning();
    return this.withReplyPreview(newMessage);
  }

  private async withReplyPreview(message: ServerMessage): Promise<ServerMessageWithRelations> {
    if (!message.replyToId) return message;
    const [row] = await db
      .select({
        message: serverMessages,
        sender: users,
      })
      .from(serverMessages)
      .innerJoin(users, eq(users.id, serverMessages.senderId))
      .where(eq(serverMessages.id, message.replyToId));
    if (!row) return message;
    const reply: MessageReplyPreview = {
      id: row.message.id,
      content: row.message.content,
      senderId: row.message.senderId,
      senderName: row.sender.username || row.sender.firstName || "Member",
    };
    return { ...message, reply };
  }

  async deleteMessage(messageId: string, deletedBy: string): Promise<void> {
    await db
      .update(serverMessages)
      .set({ deletedAt: new Date(), deletedBy })
      .where(eq(serverMessages.id, messageId));
  }

  async getDmConversations(userId: string): Promise<DmConversationWithPeer[]> {
    const rows = await db
      .select({ conversation: dmConversations, peer: users })
      .from(dmConversations)
      .innerJoin(
        users,
        sql`${users.id} = CASE
          WHEN ${dmConversations.participantOneId} = ${userId}
          THEN ${dmConversations.participantTwoId}
          ELSE ${dmConversations.participantOneId}
        END`,
      )
      .where(
        sql`(${dmConversations.participantOneId} = ${userId}
          OR ${dmConversations.participantTwoId} = ${userId})
          AND ${dmConversations.status} <> 'declined'`,
      )
      .orderBy(desc(dmConversations.updatedAt));
    return rows.map(({ conversation, peer }) => ({
      ...conversation,
      peer: {
        id: peer.id,
        username: peer.username,
        firstName: peer.firstName,
        profileImageUrl: peer.profileImageUrl,
        status: peer.status,
      },
      isIncoming: conversation.requesterId !== userId,
    }));
  }

  async getDmConversation(
    conversationId: string,
    userId: string,
  ): Promise<DmConversationWithPeer | undefined> {
    const [row] = await db
      .select({ conversation: dmConversations, peer: users })
      .from(dmConversations)
      .innerJoin(
        users,
        sql`${users.id} = CASE
          WHEN ${dmConversations.participantOneId} = ${userId}
          THEN ${dmConversations.participantTwoId}
          ELSE ${dmConversations.participantOneId}
        END`,
      )
      .where(
        and(
          eq(dmConversations.id, conversationId),
          sql`(${dmConversations.participantOneId} = ${userId}
            OR ${dmConversations.participantTwoId} = ${userId})`,
        ),
      );
    if (!row) return undefined;
    return {
      ...row.conversation,
      peer: {
        id: row.peer.id,
        username: row.peer.username,
        firstName: row.peer.firstName,
        profileImageUrl: row.peer.profileImageUrl,
        status: row.peer.status,
      },
      isIncoming: row.conversation.requesterId !== userId,
    };
  }

  async createDmConversation(requesterId: string, peerId: string): Promise<DmConversationWithPeer> {
    const [participantOneId, participantTwoId] = [requesterId, peerId].sort();
    const [existing] = await db
      .select()
      .from(dmConversations)
      .where(
        and(
          eq(dmConversations.participantOneId, participantOneId),
          eq(dmConversations.participantTwoId, participantTwoId),
        ),
      );

    let conversation = existing;
    if (conversation?.status === "declined") {
      [conversation] = await db
        .update(dmConversations)
        .set({ requesterId, status: "pending", updatedAt: new Date() })
        .where(eq(dmConversations.id, conversation.id))
        .returning();
    } else if (!conversation) {
      const [created] = await db
        .insert(dmConversations)
        .values({ participantOneId, participantTwoId, requesterId })
        .onConflictDoNothing()
        .returning();
      conversation = created;
      if (!conversation) {
        [conversation] = await db
          .select()
          .from(dmConversations)
          .where(
            and(
              eq(dmConversations.participantOneId, participantOneId),
              eq(dmConversations.participantTwoId, participantTwoId),
            ),
          );
      }
    }

    if (!conversation) throw new Error("Failed to create direct message conversation");
    const result = await this.getDmConversation(conversation.id, requesterId);
    if (!result) throw new Error("Failed to load direct message conversation");
    return result;
  }

  async respondToDmRequest(
    conversationId: string,
    userId: string,
    accepted: boolean,
  ): Promise<DmConversation | undefined> {
    const [conversation] = await db
      .update(dmConversations)
      .set({ status: accepted ? "accepted" : "declined", updatedAt: new Date() })
      .where(
        and(
          eq(dmConversations.id, conversationId),
          sql`${dmConversations.requesterId} <> ${userId}`,
          eq(dmConversations.status, "pending"),
          sql`(${dmConversations.participantOneId} = ${userId}
            OR ${dmConversations.participantTwoId} = ${userId})`,
        ),
      )
      .returning();
    return conversation;
  }

  async getDmMessages(conversationId: string, limit = 100): Promise<DmMessageWithSender[]> {
    const rows = await db
      .select({ message: dmMessages, sender: users })
      .from(dmMessages)
      .innerJoin(users, eq(users.id, dmMessages.senderId))
      .where(eq(dmMessages.conversationId, conversationId))
      .orderBy(desc(dmMessages.createdAt))
      .limit(limit);
    return rows.reverse().map(({ message, sender }) => ({
      ...message,
      sender: {
        id: sender.id,
        username: sender.username,
        firstName: sender.firstName,
        profileImageUrl: sender.profileImageUrl,
      },
    }));
  }

  async createDmMessage(
    conversationId: string,
    senderId: string,
    content: string,
  ): Promise<DmMessageWithSender> {
    const [message] = await db
      .insert(dmMessages)
      .values({ conversationId, senderId, content })
      .returning();
    await db
      .update(dmConversations)
      .set({ updatedAt: new Date() })
      .where(eq(dmConversations.id, conversationId));
    const [sender] = await db
      .select()
      .from(users)
      .where(eq(users.id, senderId));
    return {
      ...message,
      sender: {
        id: sender.id,
        username: sender.username,
        firstName: sender.firstName,
        profileImageUrl: sender.profileImageUrl,
      },
    };
  }
}

export const storage = new DatabaseStorage();