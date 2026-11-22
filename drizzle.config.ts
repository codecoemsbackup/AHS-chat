import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  tablesFilter: [
    "friend_nicknames",
    "group_chats",
    "group_chat_members",
    "group_chat_messages",
  ],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
