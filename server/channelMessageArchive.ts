import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ServerMessage } from "@shared/schema";

export type ArchivedUpload = {
  key: string;
  mimeType: string;
  originalName: string;
  size: number;
  data: Buffer;
};

export type ArchivedReaction = {
  emoji: string;
  userId: string;
  name: string;
};

export type ArchivedPollVote = {
  userId: string;
  optionIndex: number;
  username: string | null;
  firstName: string | null;
};

export type ArchivedChannelMessage = {
  message: ServerMessage;
  reactions: ArchivedReaction[];
  votes: ArchivedPollVote[];
};

type SerializedChannelMessage = Omit<ServerMessage, "createdAt" | "deletedAt"> & {
  createdAt: string | null;
  deletedAt: string | null;
};

type SerializedArchiveRecord = Omit<ArchivedChannelMessage, "message"> & {
  message: SerializedChannelMessage;
};

function getArchiveRoot() {
  const root = process.env.MESSAGE_ARCHIVE_DIR?.trim();
  if (!root) return null;
  return path.resolve(root);
}

function getChannelDirectory(channelId: string) {
  if (!/^[\w-]+$/.test(channelId)) {
    throw new Error("Invalid channel id for message archive");
  }
  const root = getArchiveRoot();
  if (!root) {
    throw new Error(
      "Message archiving is not configured. Attach a Render Persistent Disk and set MESSAGE_ARCHIVE_DIR.",
    );
  }
  return path.join(root, channelId);
}

function getArchivedUploadPath(key: string) {
  if (!/^files\/[\w-]+\.[a-z0-9]+$/i.test(key)) {
    throw new Error("Invalid archived upload key");
  }
  const root = getArchiveRoot();
  if (!root) {
    throw new Error(
      "Message archiving is not configured. Attach a Render Persistent Disk and set MESSAGE_ARCHIVE_DIR.",
    );
  }
  return path.join(root, "uploads", key);
}

function toArchiveFileName(message: ServerMessage) {
  const timestamp = message.createdAt?.toISOString() || "0000-00-00T00:00:00.000Z";
  return `${timestamp}_${message.id}.json`;
}

function fromSerializedRecord(record: SerializedArchiveRecord): ArchivedChannelMessage {
  const { createdAt, deletedAt, ...rest } = record.message;
  return {
    ...record,
    message: {
      ...rest,
      createdAt: createdAt ? new Date(createdAt) : null,
      deletedAt: deletedAt ? new Date(deletedAt) : null,
    },
  };
}

async function readRecord(filePath: string): Promise<ArchivedChannelMessage> {
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as SerializedArchiveRecord;
  if (
    !parsed ||
    !parsed.message ||
    typeof parsed.message.id !== "string" ||
    !Array.isArray(parsed.reactions) ||
    !Array.isArray(parsed.votes)
  ) {
    throw new Error(`Invalid archived message record: ${path.basename(filePath)}`);
  }
  return fromSerializedRecord(parsed);
}

export async function writeArchivedChannelMessage(
  record: ArchivedChannelMessage,
): Promise<void> {
  const directory = getChannelDirectory(record.message.channelId);
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, toArchiveFileName(record.message));
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  const serialized: SerializedArchiveRecord = {
    ...record,
    message: {
      ...record.message,
      createdAt: record.message.createdAt?.toISOString() || null,
      deletedAt: record.message.deletedAt?.toISOString() || null,
    },
  };
  try {
    await writeFile(temporaryPath, JSON.stringify(serialized), { flag: "wx" });
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function prepareMessageArchive(): Promise<void> {
  const root = getArchiveRoot();
  if (!root) return;
  await mkdir(root, { recursive: true });
  const probePath = path.join(root, `.write-check-${randomUUID()}`);
  try {
    await writeFile(probePath, "", { flag: "wx" });
  } finally {
    await rm(probePath, { force: true });
  }
}

export async function writeArchivedUpload(upload: ArchivedUpload): Promise<void> {
  const filePath = getArchivedUploadPath(upload.key);
  const metadataPath = `${filePath}.json`;
  await mkdir(path.dirname(filePath), { recursive: true });
  const token = randomUUID();
  const temporaryDataPath = `${filePath}.${token}.tmp`;
  const temporaryMetadataPath = `${metadataPath}.${token}.tmp`;
  try {
    await writeFile(temporaryDataPath, upload.data, { flag: "wx" });
    await writeFile(
      temporaryMetadataPath,
      JSON.stringify({
        key: upload.key,
        mimeType: upload.mimeType,
        originalName: upload.originalName,
        size: upload.size,
      }),
      { flag: "wx" },
    );
    await rename(temporaryDataPath, filePath);
    await rename(temporaryMetadataPath, metadataPath);
  } catch (error) {
    await rm(temporaryDataPath, { force: true });
    await rm(temporaryMetadataPath, { force: true });
    throw error;
  }
}

export async function readArchivedUpload(key: string): Promise<ArchivedUpload | undefined> {
  if (!/^files\//i.test(key) || !getArchiveRoot()) return undefined;
  const filePath = getArchivedUploadPath(key);
  try {
    const metadata = JSON.parse(
      await readFile(`${filePath}.json`, "utf8"),
    ) as Omit<ArchivedUpload, "data">;
    const data = await readFile(filePath);
    if (
      metadata.key !== key ||
      typeof metadata.mimeType !== "string" ||
      typeof metadata.originalName !== "string" ||
      metadata.size !== data.length
    ) {
      throw new Error(`Invalid archived upload metadata: ${key}`);
    }
    return { ...metadata, data };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function removeArchivedUpload(key: string): Promise<void> {
  if (!/^files\//i.test(key) || !getArchiveRoot()) return;
  const filePath = getArchivedUploadPath(key);
  await Promise.all([
    rm(filePath, { force: true }),
    rm(`${filePath}.json`, { force: true }),
  ]);
}

export async function readArchivedChannelMessages(
  channelId: string,
  beforeCreatedAt: Date | undefined,
  beforeId: string | undefined,
  limit: number,
): Promise<ArchivedChannelMessage[]> {
  const root = getArchiveRoot();
  if (!root) return [];
  const directory = getChannelDirectory(channelId);
  let fileNames: string[];
  try {
    fileNames = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const beforeKey =
    beforeCreatedAt && beforeId
      ? `${beforeCreatedAt.toISOString()}_${beforeId}.json`
      : undefined;
  const candidates = fileNames
    .filter((name) => name.endsWith(".json") && (!beforeKey || name < beforeKey))
    .sort()
    .reverse();
  const records: ArchivedChannelMessage[] = [];
  for (const fileName of candidates) {
    const record = await readRecord(path.join(directory, fileName));
    if (record.message.deletedAt) continue;
    if (
      record.message.content.replace(/[\s\u200B-\u200D\uFEFF]/g, "").length === 0 &&
      !record.message.attachmentUrl
    ) {
      continue;
    }
    records.push(record);
    if (records.length > limit) break;
  }
  return records;
}

export async function readArchivedChannelMessage(
  channelId: string,
  messageId: string,
): Promise<ArchivedChannelMessage | undefined> {
  const root = getArchiveRoot();
  if (!root) return undefined;
  const directory = getChannelDirectory(channelId);
  let fileNames: string[];
  try {
    fileNames = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  const fileName = fileNames.find((name) => name.endsWith(`_${messageId}.json`));
  return fileName ? readRecord(path.join(directory, fileName)) : undefined;
}

export async function updateArchivedChannelMessage(
  record: ArchivedChannelMessage,
): Promise<void> {
  await writeArchivedChannelMessage(record);
}

export async function removeChannelMessageArchive(channelId: string): Promise<void> {
  const root = getArchiveRoot();
  if (!root) return;
  await rm(getChannelDirectory(channelId), { recursive: true, force: true });
}

export function isMessageArchiveConfigured() {
  return Boolean(getArchiveRoot());
}
