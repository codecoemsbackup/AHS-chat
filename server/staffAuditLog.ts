import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type StaffAuditAction =
  | "message_deleted"
  | "reaction_added"
  | "reaction_removed"
  | "channel_created"
  | "channel_updated"
  | "channel_deleted"
  | "admin_permission_changed"
  | "owner_permission_changed"
  | "member_renamed"
  | "member_banned"
  | "member_unbanned"
  | "poll_created"
  | "admin_message_posted"
  | "group_created"
  | "group_member_added"
  | "group_member_removed"
  | "group_updated"
  | "group_avatar_updated"
  | "group_deleted"
  | "site_announcement_published"
  | "site_announcement_cleared";

export type StaffAuditLog = {
  id: string;
  timestamp: string;
  action: StaffAuditAction;
  actorName: string;
  actorId?: string;
  summary?: string;
  details?: string;
  targetId?: string;
  targetName?: string;
  channelId?: string;
  channelName?: string;
  messageId?: string;
  messageSenderName?: string;
  deletedSenderName?: string;
  deletedContent?: string;
  emoji?: string;
};

function getLogPath() {
  const root = process.env.MESSAGE_ARCHIVE_DIR?.trim() || path.join(process.cwd(), "data");
  return path.join(path.resolve(root), "logs.json");
}

function getLegacyLogPath() {
  const root = process.env.MESSAGE_ARCHIVE_DIR?.trim() || path.join(process.cwd(), "data");
  return path.join(path.resolve(root), "staff-audit-logs.jsonl");
}

async function readAuditRecords(): Promise<StaffAuditLog[]> {
  try {
    const contents = await readFile(getLogPath(), "utf8");
    const records: unknown = JSON.parse(contents);
    if (!Array.isArray(records)) {
      throw new Error("Audit log file must contain a JSON array");
    }
    return records as StaffAuditLog[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  try {
    const contents = await readFile(getLegacyLogPath(), "utf8");
    return contents
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as StaffAuditLog);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

let pendingWrite = Promise.resolve();

export async function appendStaffAuditLog(
  event: Omit<StaffAuditLog, "id" | "timestamp">,
): Promise<StaffAuditLog> {
  const record: StaffAuditLog = {
    ...event,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const write = pendingWrite.then(async () => {
    const filePath = getLogPath();
    await mkdir(path.dirname(filePath), { recursive: true });
    const records = await readAuditRecords();
    records.push(record);
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(records), { encoding: "utf8" });
    await rename(temporaryPath, filePath);
  });
  pendingWrite = write.catch(() => undefined);
  await write;
  return record;
}

export async function getStaffAuditLogs(): Promise<StaffAuditLog[]> {
  await pendingWrite;
  return (await readAuditRecords()).reverse();
}
