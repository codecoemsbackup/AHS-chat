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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  mentionUserIds: jsonb("mention_user_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  attachmentUrl: varchar("attachment_url"),
  attachmentName: varchar("attachment_name"),
  attachmentMimeType: varchar("attachment_mime_type"),
  attachmentSize: integer("attachment_size"),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by").references(() => users.id, { onDelete: "set null" }),
});

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

export const updateUsernameSchema = z.object({
  username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
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
});

export const localLoginSchema = z.object({
  username: z.string().trim().min(1).max(20),
  password: z.string().min(1).max(128),
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
};
export type BannedUser = typeof bannedUsers.$inferSelect;
