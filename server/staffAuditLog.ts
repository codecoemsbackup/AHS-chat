import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export type StaffAuditAction =
  | "message_deleted"
  | "reaction_added"
  | "reaction_removed";

export type StaffAuditLog = {
  id: string;
  timestamp: string;
  action: StaffAuditAction;
  actorName: string;
  channelId: string;
  channelName: string;
  messageId: string;
  deletedSenderName?: string;
  deletedContent?: string;
  emoji?: string;
};

function getLogPath() {
  const root = process.env.MESSAGE_ARCHIVE_DIR?.trim() || path.join(process.cwd(), "data");
  return path.join(path.resolve(root), "staff-audit-logs.jsonl");
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
  const line = `${JSON.stringify(record)}\n`;
  const write = pendingWrite.then(async () => {
    const filePath = getLogPath();
    await mkdir(path.dirname(filePath), { recursive: true });
    await appendFile(filePath, line, { encoding: "utf8" });
  });
  pendingWrite = write.catch(() => undefined);
  await write;
  return record;
}

export async function getStaffAuditLogs(limit = 200): Promise<StaffAuditLog[]> {
  await pendingWrite;
  try {
    const contents = await readFile(getLogPath(), "utf8");
    const lines = contents.split("\n").filter(Boolean).slice(-limit);
    return lines.reverse().map((line) => JSON.parse(line) as StaffAuditLog);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
