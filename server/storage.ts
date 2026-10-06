import {
  users,
  servers,
  channels,
  serverMessages,
  pollVotes,
  messageReactions,
  dmConversations,
  dmMessages,
  dmMessageReactions,
  bannedUsers,
  type User,
  type UpsertUser,
  type Server,
  type Channel,
  type ServerMessage,
  type ServerMessageWithRelations,
  type MessageReplyPreview,
  type InsertServerMessage,
  type PollDefinition,
  type PollResults,
  type PollVoter,
  type MessagePage,
  type MessagePagination,
  type DmConversation,
  type DmConversationWithPeer,
  type InsertDmMessage,
  type DmMessageWithSender,
  type MessageReactionSummary,
} from "@shared/schema";
import { db } from "./db";
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";

export const MAIN_SERVER_ID = "main";
export const DEFAULT_CHANNEL_NAME = "general";

export type ServerMember = User & { isBanned: boolean; banReason: string | null };

function summarizeReactions(
  rows: Array<{ emoji: string; userId: string }>,
  userId: string,
): MessageReactionSummary[] {
  const grouped = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const row of rows) {
    const summary = grouped.get(row.emoji) || { count: 0, reactedByMe: false };
    summary.count += 1;
    if (row.userId === userId) summary.reactedByMe = true;
    grouped.set(row.emoji, summary);
  }
  return Array.from(grouped, ([emoji, summary]) => ({ emoji, ...summary }));
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateEmail(userId: string, email: string): Promise<User>;
  createLocalUser(username: string, email: string, passwordHash: string, firstName: string, lastName: string): Promise<User>;
  updateRealName(userId: string, firstName: string, lastName: string): Promise<User>;
  updateUserStatus(userId: string, status: string): Promise<void>;
  updateCustomStatus(userId: string, customStatus: string | null): Promise<User>;
  updateDoNotDisturb(userId: string, enabled: boolean): Promise<User>;
  updateAppearance(userId: string, themeColor: string, usernameColor: string): Promise<User>;
  updateUsername(userId: string, username: string): Promise<User>;
  updateProfileImage(userId: string, profileImageUrl: string): Promise<User>;

  ensureServer(): Promise<Server>;
  getChannels(): Promise<Channel[]>;
  getChannel(channelId: string): Promise<Channel | undefined>;
  getChannelForMessage(messageId: string): Promise<Channel | undefined>;
  createChannel(name: string, description?: string): Promise<Channel>;
  updateChannel(channelId: string, name: string, description?: string): Promise<Channel>;
  deleteChannel(channelId: string): Promise<void>;

  getMembers(): Promise<ServerMember[]>;
  updateAdmin(userId: string, isAdmin: boolean): Promise<User>;
  updateAdminDelegation(userId: string, enabled: boolean): Promise<User>;
  banUser(userId: string, bannedBy: string, reason?: string): Promise<void>;
  unbanUser(userId: string): Promise<void>;
  isUserBanned(userId: string): Promise<boolean>;

  getChannelMessages(
    channelId: string,
    pagination: MessagePagination,
    userId: string,
    includeVoters?: boolean,
  ): Promise<MessagePage<ServerMessageWithRelations>>;
  createPoll(
    channelId: string,
    senderId: string,
    pollData: PollDefinition,
    includeVoters?: boolean,
  ): Promise<ServerMessageWithRelations>;
  voteOnPoll(
    messageId: string,
    userId: string,
    optionIndexes: number[],
    includeVoters?: boolean,
  ): Promise<ServerMessageWithRelations>;
  createMessage(message: InsertServerMessage & { senderId: string }): Promise<ServerMessageWithRelations>;
  deleteMessage(messageId: string, deletedBy: string): Promise<void>;
  getMessageReactions(messageIds: string[], userId: string): Promise<Map<string, MessageReactionSummary[]>>;
  toggleMessageReaction(messageId: string, userId: string, emoji: string): Promise<{
    added: boolean;
    reactions: MessageReactionSummary[];
  }>;

  getDmConversations(userId: string, canViewRealNames?: boolean): Promise<DmConversationWithPeer[]>;
  getDmConversation(conversationId: string, userId: string, canViewRealNames?: boolean): Promise<DmConversationWithPeer | undefined>;
  createDmConversation(requesterId: string, peerId: string, canViewRealNames?: boolean): Promise<DmConversationWithPeer>;
  respondToDmRequest(conversationId: string, userId: string, accepted: boolean): Promise<DmConversation | undefined>;
  cancelDmRequest(conversationId: string, userId: string): Promise<DmConversation | undefined>;
  getDmMessages(
    conversationId: string,
    pagination: MessagePagination,
    userId: string,
    canViewRealNames?: boolean,
  ): Promise<MessagePage<DmMessageWithSender>>;
  createDmMessage(
    conversationId: string,
    senderId: string,
    message: InsertDmMessage,
  ): Promise<DmMessageWithSender>;
  getDmMessageReactions(messageIds: string[], userId: string): Promise<Map<string, MessageReactionSummary[]>>;
  toggleDmMessageReaction(conversationId: string, messageId: string, userId: string, emoji: string): Promise<{
    added: boolean;
    reactions: MessageReactionSummary[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateAppearance(
    userId: string,
    themeColor: string,
    usernameColor: string,
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ themeColor, usernameColor, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`);
    return user;
  }

  async updateEmail(userId: string, email: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ email, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createLocalUser(
    username: string,
    email: string,
    passwordHash: string,
    firstName: string,
    lastName: string,
  ): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ username, email, passwordHash, firstName, lastName })
      .returning();
    await this.ensureServer();
    return user;
  }

  async updateRealName(userId: string, firstName: string, lastName: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ firstName, lastName, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStatus(userId: string, status: string): Promise<void> {
    await db
      .update(users)
      .set({ status, lastSeen: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateCustomStatus(userId: string, customStatus: string | null): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ customStatus, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateDoNotDisturb(userId: string, enabled: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ doNotDisturb: enabled, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
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
    const [staff] = await db
      .select({ id: channels.id })
      .from(channels)
      .where(sql`${channels.serverId} = ${MAIN_SERVER_ID} AND lower(btrim(${channels.name})) = 'staff'`)
      .limit(1);
    if (!staff) {
      const [lastChannel] = await db
        .select({ position: channels.position })
        .from(channels)
        .where(eq(channels.serverId, MAIN_SERVER_ID))
        .orderBy(desc(channels.position))
        .limit(1);
      await db.insert(channels).values({
        serverId: MAIN_SERVER_ID,
        name: "staff",
        description: "Private chat for server staff.",
        position: (lastChannel?.position ?? 0) + 1,
      });
    }
    await this.claimOwnerIfNeeded();
    const [server] = await db.select().from(servers).where(eq(servers.id, MAIN_SERVER_ID));
    return server;
  }

  async ensureDmSchema(): Promise<void> {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS dm_conversations (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      participant_one_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      participant_two_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      requester_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status varchar NOT NULL DEFAULT 'pending',
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS dm_conversations_participants_unique
      ON dm_conversations (participant_one_id, participant_two_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS dm_conversations_participant_one_idx
      ON dm_conversations (participant_one_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS dm_conversations_participant_two_idx
      ON dm_conversations (participant_two_id)`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS dm_messages (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id varchar NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
      sender_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      attachment_url varchar,
      attachment_name varchar,
      attachment_mime_type varchar,
      attachment_size integer,
      created_at timestamp DEFAULT now()
    )`);
    await db.execute(sql`ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS attachment_url varchar`);
    await db.execute(sql`ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS attachment_name varchar`);
    await db.execute(sql`ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS attachment_mime_type varchar`);
    await db.execute(sql`ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS attachment_size integer`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS dm_messages_conversation_created_idx
      ON dm_messages (conversation_id, created_at)`);
  }

  async ensureUploadsSchema(): Promise<void> {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS uploads (
      key varchar PRIMARY KEY,
      mime_type varchar(120) NOT NULL,
      original_name varchar(120) NOT NULL,
      size integer NOT NULL,
      data bytea NOT NULL,
      created_at timestamp DEFAULT now()
    )`);
  }

  async ensureCustomStatusSchema(): Promise<void> {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_status varchar(80)`);
  }

  async ensureDoNotDisturbSchema(): Promise<void> {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS do_not_disturb boolean NOT NULL DEFAULT false`);
  }

  async ensureAppearanceSchema(): Promise<void> {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_color varchar(7) NOT NULL DEFAULT '#7c3aed'`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS username_color varchar(7) NOT NULL DEFAULT '#ffffff'`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS app_migrations (
      name varchar(255) PRIMARY KEY,
      applied_at timestamp NOT NULL DEFAULT now()
    )`);
    await db.execute(sql`WITH applied AS (
      INSERT INTO app_migrations (name)
      VALUES ('username-color-white-default')
      ON CONFLICT DO NOTHING
      RETURNING name
    )
    UPDATE users
    SET username_color = '#ffffff'
    WHERE username_color = '#7c3aed'
      AND EXISTS (SELECT 1 FROM applied)`);
    await db.execute(sql`ALTER TABLE users ALTER COLUMN username_color SET DEFAULT '#ffffff'`);
  }

  async ensureMessagePaginationIndexes(): Promise<void> {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS server_messages_channel_created_id_idx
      ON server_messages (channel_id, created_at, id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS dm_messages_conversation_created_id_idx
      ON dm_messages (conversation_id, created_at, id)`);
  }

  async ensurePollsSchema(): Promise<void> {
    await db.execute(sql`ALTER TABLE server_messages ADD COLUMN IF NOT EXISTS poll_data jsonb`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS poll_votes (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id varchar NOT NULL REFERENCES server_messages(id) ON DELETE CASCADE,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      option_index integer NOT NULL,
      created_at timestamp DEFAULT now(),
      CONSTRAINT poll_votes_message_user_option_unique UNIQUE (message_id, user_id, option_index)
    )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS poll_votes_message_idx ON poll_votes (message_id)`);
  }

  async ensureMessageReactionsSchema(): Promise<void> {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS message_reactions (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id varchar NOT NULL REFERENCES server_messages(id) ON DELETE CASCADE,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji varchar(32) NOT NULL,
      created_at timestamp DEFAULT now(),
      CONSTRAINT message_reactions_message_user_emoji_unique UNIQUE (message_id, user_id, emoji)
    )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS message_reactions_message_idx
      ON message_reactions (message_id)`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS dm_message_reactions (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id varchar NOT NULL REFERENCES dm_messages(id) ON DELETE CASCADE,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji varchar(32) NOT NULL,
      created_at timestamp DEFAULT now(),
      CONSTRAINT dm_message_reactions_message_user_emoji_unique UNIQUE (message_id, user_id, emoji)
    )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS dm_message_reactions_message_idx
      ON dm_message_reactions (message_id)`);
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

  async getChannelForMessage(messageId: string): Promise<Channel | undefined> {
    const [channel] = await db
      .select({ channel: channels })
      .from(serverMessages)
      .innerJoin(channels, eq(channels.id, serverMessages.channelId))
      .where(eq(serverMessages.id, messageId));
    return channel?.channel;
  }

  async createChannel(name: string, description?: string): Promise<Channel> {
    if (name.trim().toLowerCase() === "staff") {
      throw new Error("The staff channel is reserved");
    }
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
    if (name.trim().toLowerCase() === "staff") {
      throw new Error("The staff channel name is reserved");
    }
    const existingChannel = await this.getChannel(channelId);
    if (existingChannel?.name.trim().toLowerCase() === "staff") {
      throw new Error("The staff channel cannot be renamed");
    }
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
    if (channel.name.trim().toLowerCase() === "staff") {
      throw new Error("The staff channel cannot be deleted");
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

  async getChannelMessages(
    channelId: string,
    pagination: MessagePagination,
    userId: string,
    includeVoters = false,
  ): Promise<MessagePage<ServerMessageWithRelations>> {
    const conditions = [
      eq(serverMessages.channelId, channelId),
      isNull(serverMessages.deletedAt),
      sql`(
        btrim(${serverMessages.content}) <> ''
        OR ${serverMessages.attachmentUrl} IS NOT NULL
      )`,
    ];
    if (pagination.beforeCreatedAt && pagination.beforeId) {
      const beforeDate = new Date(pagination.beforeCreatedAt);
      conditions.push(
        or(
          lt(serverMessages.createdAt, beforeDate),
          and(
            eq(serverMessages.createdAt, beforeDate),
            lt(serverMessages.id, pagination.beforeId),
          ),
        )!,
      );
    }
    const messages = await db
      .select()
      .from(serverMessages)
      .where(and(...conditions))
      .orderBy(desc(serverMessages.createdAt), desc(serverMessages.id))
      .limit(pagination.limit + 1);
    const hasMore = messages.length > pagination.limit;
    const visibleMessages = messages
      .slice(0, pagination.limit)
      .filter(
        (message) =>
          message.content.replace(/[\s\u200B-\u200D\uFEFF]/g, "").length > 0 ||
          Boolean(message.attachmentUrl),
      )
      .reverse();
    const pollMessageIds = visibleMessages
      .filter((message) => message.pollData)
      .map((message) => message.id);
    const votes = pollMessageIds.length
      ? await db
          .select({
            userId: pollVotes.userId,
            messageId: pollVotes.messageId,
            optionIndex: pollVotes.optionIndex,
            username: users.username,
            firstName: users.firstName,
          })
          .from(pollVotes)
          .innerJoin(users, eq(users.id, pollVotes.userId))
          .where(inArray(pollVotes.messageId, pollMessageIds))
      : [];
    const votesByMessage = new Map<string, typeof votes>();
    for (const vote of votes) {
      const current = votesByMessage.get(vote.messageId) || [];
      current.push(vote);
      votesByMessage.set(vote.messageId, current);
    }
    const reactionsByMessage = await this.getMessageReactions(
      visibleMessages.map((message) => message.id),
      userId,
    );
    const formattedMessages = await Promise.all(
      visibleMessages.map(async (message) => {
        const withReply = await this.withReplyPreview(message);
        if (!message.pollData) {
          return {
            ...withReply,
            reactions: reactionsByMessage.get(message.id) || [],
          };
        }
        return {
          ...withReply,
          reactions: reactionsByMessage.get(message.id) || [],
          pollResults: this.buildPollResults(
            message.pollData,
            votesByMessage.get(message.id) || [],
            userId,
            includeVoters,
          ),
        };
      }),
    );
    return { messages: formattedMessages, hasMore };
  }

  async createPoll(
    channelId: string,
    senderId: string,
    pollData: PollDefinition,
    includeVoters = false,
  ): Promise<ServerMessageWithRelations> {
    const [message] = await db
      .insert(serverMessages)
      .values({
        channelId,
        senderId,
        content: pollData.question,
        pollData,
      })
      .returning();
    return this.getPollMessage(message, senderId, includeVoters);
  }

  async voteOnPoll(
    messageId: string,
    userId: string,
    optionIndexes: number[],
    includeVoters = false,
  ): Promise<ServerMessageWithRelations> {
    const [message] = await db
      .select()
      .from(serverMessages)
      .where(and(eq(serverMessages.id, messageId), isNull(serverMessages.deletedAt)));
    if (!message?.pollData) throw new Error("Poll not found");
    if (optionIndexes.some((index) => index >= message.pollData!.options.length)) {
      throw new Error("Selected poll option does not exist");
    }
    if (!message.pollData.allowMultiple && optionIndexes.length !== 1) {
      throw new Error("Choose exactly one option for this poll");
    }

    await db.transaction(async (transaction) => {
      await transaction
        .delete(pollVotes)
        .where(and(eq(pollVotes.messageId, messageId), eq(pollVotes.userId, userId)));
      await transaction.insert(pollVotes).values(
        optionIndexes.map((optionIndex) => ({ messageId, userId, optionIndex })),
      );
    });
    return this.getPollMessage(message, userId, includeVoters);
  }

  private async getPollMessage(
    message: ServerMessage,
    userId?: string,
    includeVoters = false,
  ): Promise<ServerMessageWithRelations> {
    const [withReply, votes, reactionsByMessage] = await Promise.all([
      this.withReplyPreview(message),
      db
        .select({
          userId: pollVotes.userId,
          optionIndex: pollVotes.optionIndex,
          username: users.username,
          firstName: users.firstName,
        })
        .from(pollVotes)
        .innerJoin(users, eq(users.id, pollVotes.userId))
        .where(eq(pollVotes.messageId, message.id)),
      this.getMessageReactions([message.id], userId || ""),
    ]);
    if (!message.pollData) {
      return { ...withReply, reactions: reactionsByMessage.get(message.id) || [] };
    }
    return {
      ...withReply,
      reactions: reactionsByMessage.get(message.id) || [],
      pollResults: this.buildPollResults(message.pollData, votes, userId, includeVoters),
    };
  }

  private buildPollResults(
    pollData: PollDefinition,
    votes: Array<{
      userId: string;
      optionIndex: number;
      username: string | null;
      firstName: string | null;
    }>,
    userId?: string,
    includeVoters = false,
  ): PollResults {
    const counts = pollData.options.map(() => 0);
    const userOptionIndexes: number[] = [];
    const voters = new Set<string>();
    const votersByOption: PollVoter[][] = pollData.options.map(() => []);
    for (const vote of votes) {
      if (vote.optionIndex < 0 || vote.optionIndex >= counts.length) continue;
      counts[vote.optionIndex] += 1;
      voters.add(vote.userId);
      if (vote.userId === userId) userOptionIndexes.push(vote.optionIndex);
      if (includeVoters) {
        votersByOption[vote.optionIndex].push({
          userId: vote.userId,
          name: vote.username || "Member",
        });
      }
    }
    return {
      counts,
      totalVoters: voters.size,
      userOptionIndexes,
      ...(includeVoters ? { votersByOption } : {}),
    };
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
      senderName: row.sender.username || "Member",
    };
    return { ...message, reply };
  }

  async deleteMessage(messageId: string, deletedBy: string): Promise<void> {
    await db
      .update(serverMessages)
      .set({ deletedAt: new Date(), deletedBy })
      .where(eq(serverMessages.id, messageId));
  }

  async getMessageReactions(
    messageIds: string[],
    userId: string,
  ): Promise<Map<string, MessageReactionSummary[]>> {
    if (!messageIds.length) return new Map();
    const rows = await db
      .select({
        messageId: messageReactions.messageId,
        emoji: messageReactions.emoji,
        userId: messageReactions.userId,
      })
      .from(messageReactions)
      .where(inArray(messageReactions.messageId, messageIds));
    const grouped = new Map<string, Array<{ emoji: string; userId: string }>>();
    for (const row of rows) {
      const current = grouped.get(row.messageId) || [];
      current.push(row);
      grouped.set(row.messageId, current);
    }
    return new Map(
      Array.from(grouped, ([id, reactions]) => [id, summarizeReactions(reactions, userId)]),
    );
  }

  async toggleMessageReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<{ added: boolean; reactions: MessageReactionSummary[] }> {
    let added = false;
    await db.transaction(async (transaction) => {
      const [message] = await transaction
        .select({ id: serverMessages.id })
        .from(serverMessages)
        .where(and(eq(serverMessages.id, messageId), isNull(serverMessages.deletedAt)))
        .for("update");
      if (!message) throw new Error("Message not found");

      const [existing] = await transaction
        .select({ id: messageReactions.id })
        .from(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, messageId),
            eq(messageReactions.userId, userId),
            eq(messageReactions.emoji, emoji),
          ),
        );
      if (existing) {
        await transaction.delete(messageReactions).where(eq(messageReactions.id, existing.id));
        return;
      }

      const [count] = await transaction
        .select({ count: sql<number>`count(*)::int` })
        .from(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, messageId),
            eq(messageReactions.userId, userId),
          ),
        );
      if (count.count >= 10) throw new Error("You can add up to 10 reactions per message");
      await transaction.insert(messageReactions).values({ messageId, userId, emoji });
      added = true;
    });
    const reactionsByMessage = await this.getMessageReactions([messageId], userId);
    return { added, reactions: reactionsByMessage.get(messageId) || [] };
  }

  async getDmConversations(
    userId: string,
    canViewRealNames = false,
  ): Promise<DmConversationWithPeer[]> {
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
          AND ${dmConversations.status} NOT IN ('declined', 'cancelled')`,
      )
      .orderBy(desc(dmConversations.updatedAt));
    return rows.map(({ conversation, peer }) => ({
      ...conversation,
      peer: {
        id: peer.id,
        username: peer.username,
        firstName: canViewRealNames || peer.id === userId ? peer.firstName : null,
        profileImageUrl: peer.profileImageUrl,
        status: peer.status,
        customStatus: peer.customStatus,
        isOwner: peer.isOwner,
        usernameColor: peer.usernameColor,
      },
      isIncoming: conversation.requesterId !== userId,
    }));
  }

  async getDmConversation(
    conversationId: string,
    userId: string,
    canViewRealNames = false,
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
        firstName: canViewRealNames || row.peer.id === userId ? row.peer.firstName : null,
        profileImageUrl: row.peer.profileImageUrl,
        status: row.peer.status,
        customStatus: row.peer.customStatus,
        isOwner: row.peer.isOwner,
        usernameColor: row.peer.usernameColor,
      },
      isIncoming: row.conversation.requesterId !== userId,
    };
  }

  async createDmConversation(
    requesterId: string,
    peerId: string,
    canViewRealNames = false,
  ): Promise<DmConversationWithPeer> {
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
    if (conversation?.status === "declined" || conversation?.status === "cancelled") {
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
    const result = await this.getDmConversation(conversation.id, requesterId, canViewRealNames);
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

  async cancelDmRequest(
    conversationId: string,
    userId: string,
  ): Promise<DmConversation | undefined> {
    const [conversation] = await db
      .update(dmConversations)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(dmConversations.id, conversationId),
          eq(dmConversations.requesterId, userId),
          eq(dmConversations.status, "pending"),
          sql`(${dmConversations.participantOneId} = ${userId}
            OR ${dmConversations.participantTwoId} = ${userId})`,
        ),
      )
      .returning();
    return conversation;
  }

  async getDmMessages(
    conversationId: string,
    pagination: MessagePagination,
    userId: string,
    canViewRealNames = false,
  ): Promise<MessagePage<DmMessageWithSender>> {
    const conditions = [eq(dmMessages.conversationId, conversationId)];
    if (pagination.beforeCreatedAt && pagination.beforeId) {
      const beforeDate = new Date(pagination.beforeCreatedAt);
      conditions.push(
        or(
          lt(dmMessages.createdAt, beforeDate),
          and(
            eq(dmMessages.createdAt, beforeDate),
            lt(dmMessages.id, pagination.beforeId),
          ),
        )!,
      );
    }
    const rows = await db
      .select({ message: dmMessages, sender: users })
      .from(dmMessages)
      .innerJoin(users, eq(users.id, dmMessages.senderId))
      .where(and(...conditions))
      .orderBy(desc(dmMessages.createdAt), desc(dmMessages.id))
      .limit(pagination.limit + 1);
    const hasMore = rows.length > pagination.limit;
    const pageRows = rows.slice(0, pagination.limit).reverse();
    const reactionsByMessage = await this.getDmMessageReactions(
      pageRows.map(({ message }) => message.id),
      userId,
    );
    return {
      messages: pageRows.map(({ message, sender }) => ({
        ...message,
        sender: {
          id: sender.id,
          username: sender.username,
          firstName: canViewRealNames || sender.id === userId ? sender.firstName : null,
          profileImageUrl: sender.profileImageUrl,
          usernameColor: sender.usernameColor,
        },
        reactions: reactionsByMessage.get(message.id) || [],
      })),
      hasMore,
    };
  }

  async createDmMessage(
    conversationId: string,
    senderId: string,
    messageData: InsertDmMessage,
  ): Promise<DmMessageWithSender> {
    const [message] = await db
      .insert(dmMessages)
      .values({ conversationId, senderId, ...messageData })
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
        usernameColor: sender.usernameColor,
      },
    };
  }

  async getDmMessageReactions(
    messageIds: string[],
    userId: string,
  ): Promise<Map<string, MessageReactionSummary[]>> {
    if (!messageIds.length) return new Map();
    const rows = await db
      .select({
        messageId: dmMessageReactions.messageId,
        emoji: dmMessageReactions.emoji,
        userId: dmMessageReactions.userId,
      })
      .from(dmMessageReactions)
      .where(inArray(dmMessageReactions.messageId, messageIds));
    const grouped = new Map<string, Array<{ emoji: string; userId: string }>>();
    for (const row of rows) {
      const current = grouped.get(row.messageId) || [];
      current.push(row);
      grouped.set(row.messageId, current);
    }
    return new Map(
      Array.from(grouped, ([id, reactions]) => [id, summarizeReactions(reactions, userId)]),
    );
  }

  async toggleDmMessageReaction(
    conversationId: string,
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<{ added: boolean; reactions: MessageReactionSummary[] }> {
    let added = false;
    await db.transaction(async (transaction) => {
      const [message] = await transaction
        .select({ id: dmMessages.id })
        .from(dmMessages)
        .where(and(eq(dmMessages.id, messageId), eq(dmMessages.conversationId, conversationId)))
        .for("update");
      if (!message) throw new Error("Message not found");

      const [existing] = await transaction
        .select({ id: dmMessageReactions.id })
        .from(dmMessageReactions)
        .where(
          and(
            eq(dmMessageReactions.messageId, messageId),
            eq(dmMessageReactions.userId, userId),
            eq(dmMessageReactions.emoji, emoji),
          ),
        );
      if (existing) {
        await transaction.delete(dmMessageReactions).where(eq(dmMessageReactions.id, existing.id));
        return;
      }

      const [count] = await transaction
        .select({ count: sql<number>`count(*)::int` })
        .from(dmMessageReactions)
        .where(
          and(
            eq(dmMessageReactions.messageId, messageId),
            eq(dmMessageReactions.userId, userId),
          ),
        );
      if (count.count >= 10) throw new Error("You can add up to 10 reactions per message");
      await transaction.insert(dmMessageReactions).values({ messageId, userId, emoji });
      added = true;
    });
    const reactionsByMessage = await this.getDmMessageReactions([messageId], userId);
    return { added, reactions: reactionsByMessage.get(messageId) || [] };
  }
}

export const storage = new DatabaseStorage();