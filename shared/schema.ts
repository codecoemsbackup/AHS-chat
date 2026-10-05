import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Required for Replit Auth with chat extensions
export const users = pgTable(
  "users",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email").unique(),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    profileImageUrl: varchar("profile_image_url"),
    customStatus: varchar("custom_status", { length: 80 }),
    doNotDisturb: boolean("do_not_disturb").notNull().default(false),
    username: varchar("username").unique(),
    passwordHash: varchar("password_hash"),
    status: varchar("status").notNull().default("offline"),
    isAdmin: boolean("is_admin").notNull().default(false),
    isOwner: boolean("is_owner").notNull().default(false),
    allowAdminManagement: boolean("allow_admin_management").notNull().default(false),
    lastSeen: timestamp("last_seen").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [uniqueIndex("users_username_lower_unique").on(sql`lower(${table.username})`)],
);

export const servers = pgTable("servers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const channels = pgTable("channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id")
    .notNull()
    .references(() => servers.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const serverMessages = pgTable("server_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id")
    .notNull()
    .references(() => channels.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  replyToId: varchar("reply_to_id"),
  content: text("content").notNull(),
  pollData: jsonb("poll_data").$type<PollDefinition | null>(),
  mentionUserIds: jsonb("mention_user_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  attachmentUrl: varchar("attachment_url"),
  attachmentName: varchar("attachment_name"),
  attachmentMimeType: varchar("attachment_mime_type"),
  attachmentSize: integer("attachment_size"),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  index("server_messages_channel_created_id_idx").on(
    table.channelId,
    table.createdAt,
    table.id,
  ),
]);

export const pollVotes = pgTable(
  "poll_votes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    messageId: varchar("message_id")
      .notNull()
      .references(() => serverMessages.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    optionIndex: integer("option_index").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("poll_votes_message_user_option_unique").on(
      table.messageId,
      table.userId,
      table.optionIndex,
    ),
    index("poll_votes_message_idx").on(table.messageId),
  ],
);

export const messageReactions = pgTable(
  "message_reactions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    messageId: varchar("message_id")
      .notNull()
      .references(() => serverMessages.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 32 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("message_reactions_message_user_emoji_unique").on(
      table.messageId,
      table.userId,
      table.emoji,
    ),
    index("message_reactions_message_idx").on(table.messageId),
  ],
);

export const dmConversations = pgTable(
  "dm_conversations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    participantOneId: varchar("participant_one_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    participantTwoId: varchar("participant_two_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requesterId: varchar("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("dm_conversations_participants_unique").on(
      table.participantOneId,
      table.participantTwoId,
    ),
    index("dm_conversations_participant_one_idx").on(table.participantOneId),
    index("dm_conversations_participant_two_idx").on(table.participantTwoId),
  ],
);

export const dmMessages = pgTable(
  "dm_messages",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id")
      .notNull()
      .references(() => dmConversations.id, { onDelete: "cascade" }),
    senderId: varchar("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("dm_messages_conversation_created_idx").on(table.conversationId, table.createdAt),
    index("dm_messages_conversation_created_id_idx").on(
      table.conversationId, table.createdAt, table.id,
    ),
  ],
);

export const dmMessageReactions = pgTable(
  "dm_message_reactions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    messageId: varchar("message_id")
      .notNull()
      .references(() => dmMessages.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 32 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("dm_message_reactions_message_user_emoji_unique").on(
      table.messageId,
      table.userId,
      table.emoji,
    ),
    index("dm_message_reactions_message_idx").on(table.messageId),
  ],
);

export const bannedUsers = pgTable("banned_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  bannedBy: varchar("banned_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const uploads = pgTable("uploads", {
  key: varchar("key").primaryKey(),
  mimeType: varchar("mime_type", { length: 120 }).notNull(),
  originalName: varchar("original_name", { length: 120 }).notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChannelSchema = createInsertSchema(channels).pick({
  serverId: true,
  name: true,
  description: true,
});

export const insertServerMessageSchema = createInsertSchema(serverMessages)
  .pick({
    channelId: true,
    replyToId: true,
    content: true,
    mentionUserIds: true,
    attachmentUrl: true,
    attachmentName: true,
    attachmentMimeType: true,
    attachmentSize: true,
  })
  .extend({
    content: z
      .string()
      .trim()
      .max(2000)
      .default(""),
    replyToId: z.string().min(1).optional(),
    mentionUserIds: z.array(z.string().min(1)).max(20).default([]),
    attachmentUrl: z.string().regex(/^\/uploads\/[a-z]+\/[^/]+$/, "Invalid attachment").optional(),
    attachmentName: z.string().trim().min(1).max(120).optional(),
    attachmentMimeType: z.string().trim().min(1).max(120).optional(),
    attachmentSize: z.number().int().positive().max(8 * 1024 * 1024).optional(),
  })
  .superRefine((message, context) => {
    const hasText = message.content.replace(/[\s\u200B-\u200D\uFEFF]/g, "").length > 0;
    if (!hasText && !message.attachmentUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "Message cannot be empty",
      });
    }
    if (message.attachmentUrl && (!message.attachmentName || !message.attachmentMimeType || !message.attachmentSize)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attachmentUrl"],
        message: "Attachment details are incomplete",
      });
    }
  });

export const insertDmMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const toggleMessageReactionSchema = z.object({
  emoji: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .refine((emoji) => {
      const graphemes = Array.from(
        new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(emoji),
      );
      return (
        graphemes.length === 1 &&
        new RegExp("[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20e3]", "u").test(emoji)
      );
    }, "Choose one emoji"),
});

export const createDmConversationSchema = z.object({
  recipientId: z.string().min(1),
});

export const respondToDmRequestSchema = z.object({
  accepted: z.boolean(),
});

export const updateUsernameSchema = z.object({
  username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
});

export const updateCustomStatusSchema = z.object({
  customStatus: z.string().trim().max(80),
});

export const updateDoNotDisturbSchema = z.object({
  enabled: z.boolean(),
});

export const updateChannelSchema = z.object({
  name: z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9][a-zA-Z0-9-_ ]*$/),
  description: z.string().trim().max(120).optional(),
});

export const updateAdminSchema = z.object({
  isAdmin: z.boolean(),
});

export const updateAdminDelegationSchema = z.object({
  enabled: z.boolean(),
});

export const banUserSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});

export const localSignupSchema = z.object({
  username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
});

export const updateRealNameSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
});

export const localLoginSchema = z.object({
  username: z.string().trim().min(1).max(20),
  password: z.string().min(1).max(128),
});

export const createPollSchema = z.object({
  question: z.string().trim().min(1).max(200),
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(10),
  allowMultiple: z.boolean(),
}).superRefine(({ options }, context) => {
  const uniqueOptions = new Set(options.map((option) => option.toLowerCase()));
  if (uniqueOptions.size !== options.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Poll options must be unique",
      path: ["options"],
    });
  }
});

export const voteOnPollSchema = z.object({
  optionIndexes: z.array(z.number().int().min(0)).min(1).max(10),
}).superRefine(({ optionIndexes }, context) => {
  if (new Set(optionIndexes).size !== optionIndexes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Poll options cannot be selected more than once",
      path: ["optionIndexes"],
    });
  }
});

export const messagePaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(30),
  beforeCreatedAt: z.string().datetime().optional(),
  beforeId: z.string().min(1).max(100).optional(),
}).superRefine(({ beforeCreatedAt, beforeId }, context) => {
  if (Boolean(beforeCreatedAt) !== Boolean(beforeId)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Both cursor fields must be provided together",
    });
  }
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Server = typeof servers.$inferSelect;
export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type ServerMessage = typeof serverMessages.$inferSelect;
export type InsertServerMessage = z.infer<typeof insertServerMessageSchema>;
export type MessageReplyPreview = {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
};
export type ServerMessageWithRelations = ServerMessage & {
  reply?: MessageReplyPreview;
  pollResults?: PollResults;
  reactions?: MessageReactionSummary[];
};
export type PollDefinition = {
  question: string;
  options: string[];
  allowMultiple: boolean;
};
export type PollResults = {
  counts: number[];
  totalVoters: number;
  userOptionIndexes: number[];
  votersByOption?: PollVoter[][];
};
export type PollVoter = {
  userId: string;
  name: string;
};
export type MessagePage<T> = {
  messages: T[];
  hasMore: boolean;
};
export type MessageReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};
export type MessageReactionEvent = {
  messageId: string;
  emoji: string;
  count: number;
  userId: string;
  added: boolean;
};
export type MessagePagination = z.infer<typeof messagePaginationSchema>;
export type DmConversation = typeof dmConversations.$inferSelect;
export type DmMessage = typeof dmMessages.$inferSelect;
export type DmConversationWithPeer = DmConversation & {
  peer: Pick<User, "id" | "username" | "firstName" | "profileImageUrl" | "status" | "customStatus" | "isOwner">;
  isIncoming: boolean;
};
export type DmMessageWithSender = DmMessage & {
  sender: Pick<User, "id" | "username" | "firstName" | "profileImageUrl">;
  reactions?: MessageReactionSummary[];
};
export type BannedUser = typeof bannedUsers.$inferSelect;
