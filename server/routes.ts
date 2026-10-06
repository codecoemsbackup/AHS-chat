import express, { type Express, Response } from "express";
import { createServer, type Server } from "http";
import { Server as SocketServer } from "socket.io";
import passport from "passport";
import { storage } from "./storage";
import {
  setupAuth,
  isAuthenticated,
  createLocalSessionUser,
  hashPassword,
  verifyPassword,
} from "./auth";
import {
  insertServerMessageSchema,
  insertDmMessageSchema,
  createDmConversationSchema,
  respondToDmRequestSchema,
  updateUsernameSchema,
  updateCustomStatusSchema,
  updateDoNotDisturbSchema,
  updateAppearanceSchema,
  updateChannelSchema,
  updateAdminSchema,
  updateAdminDelegationSchema,
  banUserSchema,
  localSignupSchema,
  localLoginSchema,
  updateRealNameSchema,
  updateEmailSchema,
  createPollSchema,
  voteOnPollSchema,
  messagePaginationSchema,
  toggleMessageReactionSchema,
  isValidUsername,
} from "@shared/schema";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_AVATAR_BYTES,
  UPLOAD_ROOT,
  getUpload,
  removeUpload,
  saveUpload,
} from "./fileUploads";

const SERVER_ROOM = "server:main";
const STAFF_ROOM = "server:main:staff";
const connectedUsers = new Map<string, string>();

function isStaffChannel(channelName: string) {
  return channelName.trim().toLowerCase() === "staff";
}

function publicUser(user: any, viewer?: { id: string; isOwner: boolean }) {
  const { passwordHash: _passwordHash, email, ...safeUser } = user;
  const canViewRealName = viewer?.isOwner || viewer?.id === user.id;
  return {
    ...safeUser,
    email: viewer?.isOwner || viewer?.id === user.id ? email : null,
    firstName: canViewRealName ? safeUser.firstName : null,
    lastName: canViewRealName ? safeUser.lastName : null,
    status: safeUser.status === "online" ? "online" : "offline",
  };
}

function userIdFromRequest(req: any): string {
  return req.user.claims.sub;
}

async function activeUser(req: any, res: Response, requireRealName = true) {
  const userId = userIdFromRequest(req);
  const user = await storage.getUser(userId);
  if (!user) {
    res.status(401).json({ message: "User not found" });
    return undefined;
  }
  if (await storage.isUserBanned(userId)) {
    res.status(403).json({ message: "You are banned from this server" });
    return undefined;
  }
  if (requireRealName && (!user.firstName?.trim() || !user.lastName?.trim())) {
    res.status(428).json({ message: "Complete your real name before continuing" });
    return undefined;
  }
  return user;
}

async function adminUser(req: any, res: Response) {
  const user = await activeUser(req, res);
  if (!user) return undefined;
  if (!user.isAdmin) {
    res.status(403).json({ message: "Admin permission required" });
    return undefined;
  }
  return user;
}

function sendError(res: Response, error: any, fallback: string, status = 400) {
  console.error(fallback, error);
  res.status(status).json({ message: error?.message || fallback });
}

interface GifSearchResult {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

function isGifCdnUrl(url: URL) {
  return (
    url.protocol === "https:" &&
    (url.hostname === "media.tenor.com" ||
      url.hostname === "media.giphy.com" ||
      /^media\d+\.giphy\.com$/i.test(url.hostname))
  );
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  app.get("/uploads/:kind/:fileName", async (req, res, next) => {
    try {
      const upload = await getUpload(`${req.params.kind}/${req.params.fileName}`);
      if (!upload) return next();
      res.set({
        "Content-Type": upload.mimeType,
        "Content-Length": String(upload.size),
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      });
      res.send(upload.data);
    } catch (error) {
      sendError(res, error, "Failed to fetch upload", 500);
    }
  });
  app.use("/uploads", express.static(UPLOAD_ROOT, { maxAge: "1h" }));

  app.get("/api/auth/username-available", async (req: any, res: Response) => {
    const username = String(req.query.username || "").trim();
    if (!isValidUsername(username)) {
      return res.json({
        available: false,
        reason: "Use 3-20 letters or numbers from any language, or underscores.",
      });
    }
    const existing = await storage.getUserByUsername(username);
    res.json({
      available: !existing,
      reason: existing ? "That username is already taken." : "Username is available.",
    });
  });

  app.post("/api/auth/local/signup", async (req: any, res: Response) => {
    try {
      const parsed = localSignupSchema.parse(req.body);
      const existing = await storage.getUserByUsername(parsed.username);
      if (existing) {
        return res.status(409).json({ message: "That username is already taken" });
      }
      const existingEmail = await storage.getUserByEmail(parsed.email);
      if (existingEmail) {
        return res.status(409).json({ message: "That email is already associated with an account" });
      }
      const user = await storage.createLocalUser(
        parsed.username,
        parsed.email,
        await hashPassword(parsed.password),
        parsed.firstName,
        parsed.lastName,
      );
      await new Promise<void>((resolve, reject) => {
        req.login(createLocalSessionUser(user), (error: any) =>
          error ? reject(error) : resolve(),
        );
      });
      res.status(201).json(publicUser(user, user));
    } catch (error: any) {
      sendError(res, error, "Failed to create account");
    }
  });

  app.post("/api/auth/local/login", async (req: any, res: Response) => {
    try {
      const parsed = localLoginSchema.parse(req.body);
      const user = await storage.getUserByUsername(parsed.username);
      if (!user?.passwordHash || !(await verifyPassword(parsed.password, user.passwordHash))) {
        return res.status(401).json({ message: "Incorrect username or password" });
      }
      if (await storage.isUserBanned(user.id)) {
        return res.status(403).json({ message: "You are banned from this server" });
      }
      await new Promise<void>((resolve, reject) => {
        req.login(createLocalSessionUser(user), (error: any) =>
          error ? reject(error) : resolve(),
        );
      });
      res.json(publicUser(user, user));
    } catch (error: any) {
      sendError(res, error, "Failed to sign in");
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res: Response) => {
    try {
      await storage.ensureServer();
      const user = await activeUser(req, res, false);
      if (user) res.json(publicUser(user, user));
    } catch (error) {
      sendError(res, error, "Failed to fetch user", 500);
    }
  });

  app.patch("/api/profile/real-name", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res, false);
      if (!actor) return;
      const parsed = updateRealNameSchema.parse(req.body);
      const user = await storage.updateRealName(actor.id, parsed.firstName, parsed.lastName);
      ioFor(app)?.to(SERVER_ROOM).emit("member:updated", publicUser(user));
      res.json(publicUser(user, user));
    } catch (error: any) {
      sendError(res, error, "Failed to save real name");
    }
  });

  app.patch("/api/profile/email", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res, false);
      if (!actor) return;
      const parsed = updateEmailSchema.parse(req.body);
      const existing = await storage.getUserByEmail(parsed.email);
      if (existing && existing.id !== actor.id) {
        return res.status(409).json({ message: "That email is already associated with an account" });
      }
      const user = await storage.updateEmail(actor.id, parsed.email);
      ioFor(app)?.to(SERVER_ROOM).emit("member:updated", publicUser(user));
      res.json(publicUser(user, user));
    } catch (error: any) {
      sendError(res, error, "Failed to save email");
    }
  });

  app.post("/api/username", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res);
      if (!actor) return;
      const parsed = updateUsernameSchema.parse(req.body);
      const existing = await storage.getUserByUsername(parsed.username);
      if (existing && existing.id !== actor.id) {
        return res.status(400).json({ message: "Username already taken" });
      }
      res.json(publicUser(await storage.updateUsername(actor.id, parsed.username), actor));
    } catch (error: any) {
      sendError(res, error, "Failed to update username");
    }
  });

  app.post("/api/profile/avatar", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res);
      if (!actor) return;
      const upload = await saveUpload(req.body?.dataUrl, "profile-picture", {
        kind: "avatar",
        maxBytes: MAX_AVATAR_BYTES,
      });
      const user = await storage.updateProfileImage(actor.id, upload.url);
      await removeUpload(actor.profileImageUrl);
      ioFor(app)?.to(SERVER_ROOM).emit("member:updated", publicUser(user));
      res.json(publicUser(user, actor));
    } catch (error: any) {
      sendError(res, error, "Failed to update profile picture");
    }
  });

  app.patch("/api/profile/status", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res);
      if (!actor) return;
      const parsed = updateCustomStatusSchema.parse(req.body);
      const user = await storage.updateCustomStatus(actor.id, parsed.customStatus || null);
      ioFor(app)?.to(SERVER_ROOM).emit("member:updated", publicUser(user));
      res.json(publicUser(user, actor));
    } catch (error: any) {
      sendError(res, error, "Failed to update status");
    }
  });

  app.patch("/api/profile/do-not-disturb", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res);
      if (!actor) return;
      const parsed = updateDoNotDisturbSchema.parse(req.body);
      const user = await storage.updateDoNotDisturb(actor.id, parsed.enabled);
      ioFor(app)?.to(SERVER_ROOM).emit("member:updated", publicUser(user));
      res.json(publicUser(user, actor));
    } catch (error: any) {
      sendError(res, error, "Failed to update Do Not Disturb");
    }
  });

  app.patch("/api/profile/appearance", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res);
      if (!actor) return;
      const parsed = updateAppearanceSchema.parse(req.body);
      const user = await storage.updateAppearance(
        actor.id,
        parsed.themeColor,
        parsed.usernameColor,
      );
      ioFor(app)?.to(SERVER_ROOM).emit("member:updated", publicUser(user));
      res.json(publicUser(user, actor));
    } catch (error: any) {
      sendError(res, error, "Failed to update appearance");
    }
  });

  app.post("/api/uploads", isAuthenticated, async (req: any, res: Response) => {
    try {
      if (!(await activeUser(req, res))) return;
      const upload = await saveUpload(req.body?.dataUrl, req.body?.fileName, {
        kind: "attachment",
        maxBytes: MAX_ATTACHMENT_BYTES,
      });
      res.status(201).json(upload);
    } catch (error: any) {
      sendError(res, error, "Failed to upload file");
    }
  });

  app.get("/api/gifs/search", isAuthenticated, async (req: any, res: Response) => {
    try {
      if (!(await activeUser(req, res))) return;
      const query = String(req.query.q || "").trim().slice(0, 100);
      let cursor: { tenorPos?: string | null; giphyOffset?: number | null } | undefined;
      if (req.query.cursor) {
        try {
          const parsedCursor = JSON.parse(String(req.query.cursor));
          if (
            !parsedCursor ||
            typeof parsedCursor !== "object" ||
            (parsedCursor.tenorPos != null && typeof parsedCursor.tenorPos !== "string") ||
            (parsedCursor.giphyOffset != null &&
              (!Number.isInteger(parsedCursor.giphyOffset) || parsedCursor.giphyOffset < 0))
          ) {
            return res.status(400).json({ message: "Invalid GIF search cursor" });
          }
          cursor = parsedCursor;
        } catch {
          return res.status(400).json({ message: "Invalid GIF search cursor" });
        }
      }
      const providers: Array<{
        name: "Tenor" | "GIPHY";
        search: () => Promise<{ gifs: GifSearchResult[]; next: string | number | null }>;
      }> = [];
      const tenorApiKey = process.env.TENOR_API_KEY;
      const giphyApiKey = process.env.GIPHY_API_KEY;

      if (tenorApiKey) {
        providers.push({
          name: "Tenor",
          search: async () => {
            if (cursor && cursor.tenorPos == null) return { gifs: [], next: null };
            const endpoint = query
              ? "https://tenor.googleapis.com/v2/search"
              : "https://tenor.googleapis.com/v2/featured";
            const url = new URL(endpoint);
            url.searchParams.set("key", tenorApiKey);
            url.searchParams.set("client_key", "ahs-chat");
            url.searchParams.set("limit", "24");
            url.searchParams.set("media_filter", "gif,tinygif");
            if (query) url.searchParams.set("q", query);
            if (cursor?.tenorPos) url.searchParams.set("pos", cursor.tenorPos);

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Tenor returned ${response.status}`);
            const responseText = await response.text();
            let payload: {
              results?: Array<{
                id?: string;
                content_description?: string;
                media_formats?: Record<string, { url?: string; dims?: [number, number] }>;
              }>;
              next?: string;
            };
            try {
              payload = JSON.parse(responseText);
            } catch {
              throw new Error("Tenor returned a non-JSON response");
            }
            const gifs = (payload.results || []).flatMap((result) => {
              const formats = result.media_formats || {};
              const media = formats.gif || formats.mediumgif || formats.tinygif;
              const preview = formats.tinygif || media;
              if (!result.id || !media?.url || !preview?.url) return [];
              return [{
                id: `tenor:${result.id}`,
                title: result.content_description || "Tenor GIF",
                url: media.url,
                previewUrl: preview.url,
                width: media.dims?.[0] || 240,
                height: media.dims?.[1] || 180,
              }];
            });
            return { gifs, next: payload.next || null };
          },
        });
      }

      if (giphyApiKey) {
        providers.push({
          name: "GIPHY",
          search: async () => {
            if (cursor && cursor.giphyOffset == null) return { gifs: [], next: null };
            const offset = cursor?.giphyOffset ?? 0;
            const url = new URL(
              query
                ? "https://api.giphy.com/v1/gifs/search"
                : "https://api.giphy.com/v1/gifs/trending",
            );
            url.searchParams.set("api_key", giphyApiKey);
            url.searchParams.set("limit", "24");
            url.searchParams.set("offset", String(offset));
            url.searchParams.set("rating", "g");
            if (query) url.searchParams.set("q", query);

            const response = await fetch(url);
            if (!response.ok) throw new Error(`GIPHY returned ${response.status}`);
            const responseText = await response.text();
            let payload: {
              data?: Array<{
                id?: string;
                title?: string;
                images?: Record<string, {
                  url?: string;
                  width?: string;
                  height?: string;
                }>;
              }>;
              pagination?: { total_count?: number; offset?: number; count?: number };
            };
            try {
              payload = JSON.parse(responseText);
            } catch {
              throw new Error("GIPHY returned a non-JSON response");
            }
            const gifs = (payload.data || []).flatMap((result) => {
              const media = result.images?.original;
              const preview = result.images?.fixed_width_small || result.images?.fixed_width || media;
              if (!result.id || !media?.url || !preview?.url) return [];
              return [{
                id: `giphy:${result.id}`,
                title: result.title || "GIPHY GIF",
                url: media.url,
                previewUrl: preview.url,
                width: Number(media.width) || 240,
                height: Number(media.height) || 180,
              }];
            });
            const count = payload.pagination?.count ?? gifs.length;
            const next =
              offset + count < (payload.pagination?.total_count ?? offset + count)
                ? offset + count
                : null;
            return { gifs, next };
          },
        });
      }

      if (providers.length === 0) {
        return res.status(503).json({
          message: "GIF search is not configured. Set TENOR_API_KEY or GIPHY_API_KEY.",
        });
      }

      const outcomes = await Promise.all(
        providers.map(async (provider) => {
          try {
            return { provider: provider.name, ...await provider.search() };
          } catch (error) {
            return {
              provider: provider.name,
              error: error instanceof Error ? error.message : "Unknown provider error",
            };
          }
        }),
      );
      const gifs = outcomes.flatMap((outcome) => "gifs" in outcome ? outcome.gifs : []);
      const failures = outcomes.flatMap((outcome) =>
        "error" in outcome ? [`${outcome.provider}: ${outcome.error}`] : [],
      );
      if (gifs.length === 0 && failures.length > 0) {
        throw new Error(failures.join("; "));
      }
      const tenorOutcome = outcomes.find((outcome) => outcome.provider === "Tenor");
      const giphyOutcome = outcomes.find((outcome) => outcome.provider === "GIPHY");
      res.json({
        gifs,
        providers: outcomes.filter((outcome) => "gifs" in outcome).map((outcome) => outcome.provider),
        cursor: {
          tenorPos:
            tenorOutcome && "next" in tenorOutcome && typeof tenorOutcome.next === "string"
              ? tenorOutcome.next
              : null,
          giphyOffset:
            giphyOutcome && "next" in giphyOutcome && typeof giphyOutcome.next === "number"
              ? giphyOutcome.next
              : null,
        },
        warning: failures.length > 0 ? `Some GIF providers failed: ${failures.join("; ")}` : undefined,
      });
    } catch (error: any) {
      sendError(res, error, "Failed to search GIFs", 502);
    }
  });

  app.post("/api/gifs/import", isAuthenticated, async (req: any, res: Response) => {
    try {
      if (!(await activeUser(req, res))) return;
      const sourceUrl = new URL(String(req.body?.url || ""));
      if (!isGifCdnUrl(sourceUrl)) {
        return res.status(400).json({ message: "Only GIFs from Tenor or GIPHY can be imported" });
      }

      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`GIF provider returned ${response.status}`);
      if (!isGifCdnUrl(new URL(response.url))) {
        return res.status(400).json({ message: "GIF provider redirected to an unsupported host" });
      }
      const contentType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
      if (!["image/gif", "image/webp", "image/jpeg", "image/png"].includes(contentType)) {
        return res.status(400).json({ message: "That GIF result is not an image" });
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0 || buffer.length > MAX_ATTACHMENT_BYTES) {
        return res.status(400).json({ message: "That GIF is larger than 8 MB" });
      }
      const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
      const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
      const upload = await saveUpload(dataUrl, `gif.${extension}`, {
        kind: "attachment",
        maxBytes: MAX_ATTACHMENT_BYTES,
      });
      res.status(201).json(upload);
    } catch (error: any) {
      sendError(res, error, "Failed to import GIF");
    }
  });

  app.get("/api/server", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res);
      if (!actor) return;
      const server = await storage.ensureServer();
      const [channels, members] = await Promise.all([
        storage.getChannels(),
        storage.getMembers(),
      ]);
      res.json({
        server,
        channels: actor.isAdmin
          ? channels
          : channels.filter((channel) => !isStaffChannel(channel.name)),
        members: members.map((member) => publicUser(member, actor)),
      });
    } catch (error) {
      sendError(res, error, "Failed to fetch server", 500);
    }
  });

  app.get("/api/dms", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res);
      if (!actor) return;
      res.json(await storage.getDmConversations(actor.id, actor.isOwner));
    } catch (error) {
      sendError(res, error, "Failed to fetch direct messages", 500);
    }
  });

  app.post("/api/dms", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res);
      if (!actor) return;
      const { recipientId } = createDmConversationSchema.parse(req.body);
      if (recipientId === actor.id) {
        return res.status(400).json({ message: "You cannot message yourself" });
      }
      const recipient = await storage.getUser(recipientId);
      if (!recipient || (await storage.isUserBanned(recipientId))) {
        return res.status(404).json({ message: "Member not found" });
      }
      const conversation = await storage.createDmConversation(
        actor.id,
        recipient.id,
        actor.isOwner,
      );
      for (const participantId of [actor.id, recipient.id]) {
        ioFor(app)?.to(`user:${participantId}`).emit("dm:updated", {
          conversationId: conversation.id,
        });
      }
      res.status(201).json(conversation);
    } catch (error: any) {
      sendError(res, error, "Failed to start direct message");
    }
  });

  app.patch("/api/dms/:conversationId/request", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res);
      if (!actor) return;
      const { accepted } = respondToDmRequestSchema.parse(req.body);
      const conversation = await storage.getDmConversation(
        req.params.conversationId,
        actor.id,
        actor.isOwner,
      );
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
      if (conversation.requesterId === actor.id || conversation.status !== "pending") {
        return res.status(403).json({ message: "This message request cannot be changed" });
      }
      const updated = await storage.respondToDmRequest(
        conversation.id,
        actor.id,
        accepted,
      );
      if (!updated) {
        return res.status(409).json({ message: "This message request has already been handled" });
      }
      for (const participantId of [updated.participantOneId, updated.participantTwoId]) {
        ioFor(app)?.to(`user:${participantId}`).emit("dm:updated", {
          conversationId: updated.id,
        });
      }
      res.json(updated);
    } catch (error: any) {
      sendError(res, error, "Failed to respond to message request");
    }
  });

  app.delete("/api/dms/:conversationId/request", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res);
      if (!actor) return;
      const updated = await storage.cancelDmRequest(req.params.conversationId, actor.id);
      if (!updated) {
        return res.status(409).json({
          message: "Only the sender can cancel a pending request",
        });
      }
      for (const participantId of [updated.participantOneId, updated.participantTwoId]) {
        ioFor(app)?.to(`user:${participantId}`).emit("dm:updated", {
          conversationId: updated.id,
        });
      }
      res.json({ cancelled: true });
    } catch (error: any) {
      sendError(res, error, "Failed to cancel message request");
    }
  });

  app.get("/api/dms/:conversationId/messages", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res);
      if (!actor) return;
      const pagination = messagePaginationSchema.parse(req.query);
      const conversation = await storage.getDmConversation(
        req.params.conversationId,
        actor.id,
        actor.isOwner,
      );
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
      if (conversation.status !== "accepted") {
        return res.status(403).json({ message: "Accept the message request before reading messages" });
      }
      res.json(
        await storage.getDmMessages(conversation.id, pagination, actor.id, actor.isOwner),
      );
    } catch (error) {
      sendError(res, error, "Failed to fetch direct messages", 500);
    }
  });

  app.post("/api/dms/:conversationId/messages", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res);
      if (!actor) return;
      const parsed = insertDmMessageSchema.parse(req.body);
      const conversation = await storage.getDmConversation(
        req.params.conversationId,
        actor.id,
        actor.isOwner,
      );
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
      if (conversation.status !== "accepted") {
        return res.status(403).json({ message: "Accept the message request before sending messages" });
      }
      if (await storage.isUserBanned(conversation.peer.id)) {
        return res.status(403).json({ message: "This member cannot receive messages" });
      }
      const message = await storage.createDmMessage(conversation.id, actor.id, parsed);
      const peer = await storage.getUser(conversation.peer.id);
      for (const participantId of [conversation.participantOneId, conversation.participantTwoId]) {
        const participantCanViewName = participantId === actor.id || Boolean(
          participantId === conversation.peer.id && peer?.isOwner,
        );
        ioFor(app)?.to(`user:${participantId}`).emit("dm:message", {
          conversationId: conversation.id,
          message: participantCanViewName
            ? message
            : {
                ...message,
                sender: { ...message.sender, firstName: null },
              },
        });
        ioFor(app)?.to(`user:${participantId}`).emit("dm:updated", {
          conversationId: conversation.id,
        });
      }
      res.status(201).json(message);
    } catch (error: any) {
      sendError(res, error, "Failed to send direct message");
    }
  });

  app.post("/api/dms/:conversationId/messages/:messageId/reactions", isAuthenticated, async (req: any, res: Response) => {
    try {
      const actor = await activeUser(req, res);
      if (!actor) return;
      const parsed = toggleMessageReactionSchema.parse(req.body);
      const conversation = await storage.getDmConversation(
        req.params.conversationId,
        actor.id,
        actor.isOwner,
      );
      if (!conversation || conversation.status !== "accepted") {
        return res.status(404).json({ message: "Conversation not found" });
      }
      const result = await storage.toggleDmMessageReaction(
        conversation.id,
        req.params.messageId,
        actor.id,
        parsed.emoji,
      );
      const count = result.reactions.find((reaction) => reaction.emoji === parsed.emoji)?.count || 0;
      const payload = {
        conversationId: conversation.id,
        messageId: req.params.messageId,
        emoji: parsed.emoji,
        count,
        userId: actor.id,
        added: result.added,
      };
      for (const participantId of [conversation.participantOneId, conversation.participantTwoId]) {
        ioFor(app)?.to(`user:${participantId}`).emit("dm:reaction", payload);
      }
      res.json(result);
    } catch (error: any) {
      sendError(res, error, "Failed to update direct message reaction");
    }
  });

  app.post("/api/channels", isAuthenticated, async (req: any, res: Response) => {
    try {
      if (!(await adminUser(req, res))) return;
      const parsed = updateChannelSchema.parse(req.body);
      if (isStaffChannel(parsed.name)) {
        return res.status(400).json({ message: "The staff channel name is reserved" });
      }
      const channel = await storage.createChannel(parsed.name, parsed.description);
      ioFor(app)?.to(SERVER_ROOM).emit("channel:created", channel);
      res.status(201).json(channel);
    } catch (error: any) {
      sendError(res, error, "Failed to create channel");
    }
  });

  app.patch("/api/channels/:channelId", isAuthenticated, async (req: any, res: Response) => {
    try {
      if (!(await adminUser(req, res))) return;
      const parsed = updateChannelSchema.parse(req.body);
      const channel = await storage.getChannel(req.params.channelId);
      if (!channel || channel.serverId !== "main") {
        return res.status(404).json({ message: "Channel not found" });
      }
      if (isStaffChannel(channel.name) || isStaffChannel(parsed.name)) {
        return res.status(400).json({ message: "The staff channel cannot be renamed" });
      }
      if (
        channel.name.toLowerCase() === "general" &&
        parsed.name.toLowerCase() !== "general"
      ) {
        return res.status(400).json({ message: "The default general channel must keep its name" });
      }
      const updated = await storage.updateChannel(
        channel.id,
        parsed.name,
        parsed.description,
      );
      ioFor(app)?.to(SERVER_ROOM).emit("channel:updated", updated);
      res.json(updated);
    } catch (error: any) {
      sendError(res, error, "Failed to update channel");
    }
  });

  app.delete("/api/channels/:channelId", isAuthenticated, async (req: any, res: Response) => {
    try {
      if (!(await adminUser(req, res))) return;
      const channel = await storage.getChannel(req.params.channelId);
      if (!channel || channel.serverId !== "main") {
        return res.status(404).json({ message: "Channel not found" });
      }
      if (isStaffChannel(channel.name)) {
        return res.status(400).json({ message: "The staff channel cannot be deleted" });
      }
      await storage.deleteChannel(channel.id);
      ioFor(app)?.to(SERVER_ROOM).emit("channel:deleted", { channelId: channel.id });
      res.json({ success: true });
    } catch (error: any) {
      sendError(res, error, "Failed to delete channel");
    }
  });

  app.patch(
    "/api/server/admin-delegation",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const actor = await adminUser(req, res);
        if (!actor) return;
        if (!actor.isOwner || actor.username?.toLowerCase() !== "codecoems") {
          return res.status(403).json({
            message: "Only the CodeCoems owner can enable admin delegation",
          });
        }
        const parsed = updateAdminDelegationSchema.parse(req.body);
        const user = await storage.updateAdminDelegation(actor.id, parsed.enabled);
        res.json(publicUser(user, actor));
      } catch (error: any) {
        sendError(res, error, "Failed to update admin delegation");
      }
    },
  );

  app.patch(
    "/api/server/members/:userId/admin",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const actor = await adminUser(req, res);
        if (!actor) return;
        if (!actor.isOwner && !actor.allowAdminManagement) {
          return res.status(403).json({
            message: "Admin delegation is not enabled by CodeCoems",
          });
        }
        const target = await storage.getUser(req.params.userId);
        if (!target) return res.status(404).json({ message: "Member not found" });
        if (target.isOwner) {
          return res.status(400).json({ message: "The owner cannot be changed" });
        }
        const parsed = updateAdminSchema.parse(req.body);
        const user = await storage.updateAdmin(target.id, parsed.isAdmin);
        const targetSocketId = connectedUsers.get(target.id);
        const targetSocket = targetSocketId
          ? ioFor(app)?.sockets.sockets.get(targetSocketId)
          : undefined;
        if (parsed.isAdmin) targetSocket?.join(STAFF_ROOM);
        else targetSocket?.leave(STAFF_ROOM);
        ioFor(app)?.to(SERVER_ROOM).emit("member:updated", publicUser(user));
        res.json(publicUser(user, actor));
      } catch (error: any) {
        sendError(res, error, "Failed to update admin permission");
      }
    },
  );

  app.patch(
    "/api/server/members/:userId/name",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const actor = await adminUser(req, res);
        if (!actor) return;
        const target = await storage.getUser(req.params.userId);
        if (!target) return res.status(404).json({ message: "Member not found" });
        if (target.isOwner && !actor.isOwner) {
          return res.status(403).json({ message: "Only the owner can rename the owner" });
        }
        const parsed = updateUsernameSchema.parse(req.body);
        const existing = await storage.getUserByUsername(parsed.username);
        if (existing && existing.id !== target.id) {
          return res.status(400).json({ message: "Username already taken" });
        }
        const user = await storage.updateUsername(target.id, parsed.username);
        ioFor(app)?.to(SERVER_ROOM).emit("member:updated", publicUser(user));
        res.json(publicUser(user, actor));
      } catch (error: any) {
        sendError(res, error, "Failed to change member name");
      }
    },
  );

  app.post(
    "/api/server/members/:userId/ban",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const actor = await adminUser(req, res);
        if (!actor) return;
        const target = await storage.getUser(req.params.userId);
        if (!target) return res.status(404).json({ message: "Member not found" });
        if (target.id === actor.id || target.isOwner) {
          return res.status(400).json({ message: "You cannot ban this member" });
        }
        const parsed = banUserSchema.parse(req.body || {});
        await storage.banUser(target.id, actor.id, parsed.reason);
        const targetSocket = connectedUsers.get(target.id);
        if (targetSocket) {
          ioFor(app)?.to(targetSocket).emit("server:banned");
        }
        ioFor(app)?.to(SERVER_ROOM).emit("member:updated", publicUser({
          ...target,
          isBanned: true,
          banReason: parsed.reason || null,
        }));
        res.json({ success: true });
      } catch (error: any) {
        sendError(res, error, "Failed to ban member");
      }
    },
  );

  app.delete(
    "/api/server/members/:userId/ban",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        if (!(await adminUser(req, res))) return;
        await storage.unbanUser(req.params.userId);
        ioFor(app)?.to(SERVER_ROOM).emit("member:updated", {
          userId: req.params.userId,
          isBanned: false,
        });
        res.json({ success: true });
      } catch (error: any) {
        sendError(res, error, "Failed to unban member");
      }
    },
  );

  app.get(
    "/api/channels/:channelId/messages",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const actor = await activeUser(req, res);
        if (!actor) return;
        const pagination = messagePaginationSchema.parse(req.query);
        const channel = await storage.getChannel(req.params.channelId);
        if (
          !channel ||
          channel.serverId !== "main" ||
          (isStaffChannel(channel.name) && !actor.isAdmin)
        ) {
          return res.status(404).json({ message: "Channel not found" });
        }
        res.json(
          await storage.getChannelMessages(
            channel.id,
            pagination,
            actor.id,
            actor.isAdmin,
          ),
        );
      } catch (error) {
        sendError(res, error, "Failed to fetch messages", 500);
      }
    },
  );

  app.post(
    "/api/channels/:channelId/polls",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const actor = await adminUser(req, res);
        if (!actor) return;
        const channel = await storage.getChannel(req.params.channelId);
        if (
          !channel ||
          channel.serverId !== "main" ||
          channel.name.trim().toLowerCase() !== "polls"
        ) {
          return res.status(404).json({ message: "Polls can only be created in the polls channel" });
        }
        const parsed = createPollSchema.parse(req.body);
        const message = await storage.createPoll(channel.id, actor.id, {
          question: parsed.question,
          options: parsed.options,
          allowMultiple: parsed.allowMultiple,
        }, actor.isAdmin);
        ioFor(app)?.to(SERVER_ROOM).emit("message:receive", message);
        res.status(201).json(message);
      } catch (error) {
        sendError(res, error, "Failed to create poll");
      }
    },
  );

  app.post(
    "/api/polls/:messageId/votes",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const actor = await activeUser(req, res);
        if (!actor) return;
        const messageId = req.params.messageId;
        const channel = await storage.getChannelForMessage(messageId);
        if (
          !channel ||
          channel.serverId !== "main" ||
          channel.name.trim().toLowerCase() !== "polls"
        ) {
          return res.status(404).json({ message: "Poll not found" });
        }
        const parsed = voteOnPollSchema.parse(req.body);
        const message = await storage.voteOnPoll(
          messageId,
          actor.id,
          parsed.optionIndexes,
          actor.isAdmin,
        );
        ioFor(app)?.to(SERVER_ROOM).emit("poll:updated", {
          channelId: message.channelId,
          messageId: message.id,
          counts: message.pollResults?.counts || [],
          totalVoters: message.pollResults?.totalVoters || 0,
        });
        res.json(message);
      } catch (error) {
        sendError(res, error, "Failed to vote on poll");
      }
    },
  );

  app.post(
    "/api/messages/:messageId/reactions",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const actor = await activeUser(req, res);
        if (!actor) return;
        const parsed = toggleMessageReactionSchema.parse(req.body);
        const channel = await storage.getChannelForMessage(req.params.messageId);
        if (
          !channel ||
          channel.serverId !== "main" ||
          (isStaffChannel(channel.name) && !actor.isAdmin)
        ) {
          return res.status(404).json({ message: "Message not found" });
        }
        const result = await storage.toggleMessageReaction(
          req.params.messageId,
          actor.id,
          parsed.emoji,
        );
        const count = result.reactions.find((reaction) => reaction.emoji === parsed.emoji)?.count || 0;
        ioFor(app)?.to(isStaffChannel(channel.name) ? STAFF_ROOM : SERVER_ROOM).emit("message:reaction", {
          channelId: channel.id,
          messageId: req.params.messageId,
          emoji: parsed.emoji,
          count,
          userId: actor.id,
          added: result.added,
        });
        res.json(result);
      } catch (error: any) {
        sendError(res, error, "Failed to update message reaction");
      }
    },
  );

  app.delete(
    "/api/messages/:messageId",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const actor = await adminUser(req, res);
        if (!actor) return;
        const channel = await storage.getChannelForMessage(req.params.messageId);
        if (!channel) return res.status(404).json({ message: "Message not found" });
        await storage.deleteMessage(req.params.messageId, actor.id);
        ioFor(app)?.to(isStaffChannel(channel.name) ? STAFF_ROOM : SERVER_ROOM).emit("message:deleted", {
          messageId: req.params.messageId,
        });
        res.json({ success: true });
      } catch (error) {
        sendError(res, error, "Failed to delete message", 500);
      }
    },
  );

  const httpServer = createServer(app);
  const io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST", "PATCH", "DELETE"] },
  });
  const sessionMiddleware = app.get("sessionMiddleware");
  if (sessionMiddleware) {
    io.engine.use(sessionMiddleware);
    io.engine.use(passport.initialize());
    io.engine.use(passport.session());
  }
  app.set("chatIo", io);

  io.on("connection", (socket) => {
    socket.on("connection:ping", (acknowledge?: (response: { ok: true }) => void) => {
      acknowledge?.({ ok: true });
    });

    socket.on("user:connect", async (requestedUserId: string) => {
      const sessionUserId = (socket.request as any).user?.claims?.sub;
      if (!sessionUserId || sessionUserId !== requestedUserId) {
        socket.disconnect(true);
        return;
      }
      const userId = sessionUserId;
      const user = await storage.getUser(userId);
      if (!user || (await storage.isUserBanned(userId))) {
        socket.emit("server:banned");
        return;
      }
      connectedUsers.set(userId, socket.id);
      socket.data.userId = userId;
      socket.join(SERVER_ROOM);
      socket.join(`user:${userId}`);
      if (user.isAdmin) socket.join(STAFF_ROOM);
      await storage.updateUserStatus(userId, "online");
      io.to(SERVER_ROOM).emit("member:status", { userId, status: "online" });
      socket.emit("connected", { userId });
    });

    socket.on("message:send", async (data: unknown) => {
      try {
        const userId = socket.data.userId;
        if (!userId || (await storage.isUserBanned(userId))) return;
        const parsed = insertServerMessageSchema.parse(data);
        const channel = await storage.getChannel(parsed.channelId);
        if (!channel || channel.serverId !== "main") return;
        const sender = await storage.getUser(userId);
        const adminOnlyChannel = ["rules", "announcements", "polls", "staff"].includes(
          channel.name.trim().toLowerCase(),
        );
        if (!sender || (adminOnlyChannel && !sender.isAdmin)) {
          socket.emit("message:error", {
            error: adminOnlyChannel
              ? "Only admins can send messages in this channel"
              : "You do not have permission to send messages",
          });
          return;
        }
        const mentionsEveryone = parsed.mentionUserIds.includes("@everyone");
        if (mentionsEveryone && !sender.isAdmin) {
          socket.emit("message:error", {
            error: "Only admins can use @everyone",
          });
          return;
        }
        const members = await storage.getMembers();
        const validMentionUserIds = mentionsEveryone
          ? members
              .filter((member) => member.id !== userId && !member.isBanned)
              .map((member) => member.id)
          : Array.from(new Set(parsed.mentionUserIds)).filter(
              (mentionedUserId) =>
                mentionedUserId !== userId &&
                members.some((member) => member.id === mentionedUserId && !member.isBanned),
            );
        const message = await storage.createMessage({
          ...parsed,
          mentionUserIds: validMentionUserIds,
          senderId: userId,
        });
        io.to(isStaffChannel(channel.name) ? STAFF_ROOM : SERVER_ROOM).emit("message:receive", message);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message:error", { error: "Failed to send message" });
      }
    });

    socket.on("typing:start", async ({ channelId }: { channelId: string }) => {
      const userId = socket.data.userId;
      if (!userId) return;
      const channel = await storage.getChannel(channelId);
      if (!channel || (isStaffChannel(channel.name) && !socket.rooms.has(STAFF_ROOM))) return;
      const room = isStaffChannel(channel.name) ? STAFF_ROOM : SERVER_ROOM;
      socket.to(room).emit("member:typing", { userId, channelId, typing: true });
    });

    socket.on("typing:stop", async ({ channelId }: { channelId: string }) => {
      const userId = socket.data.userId;
      if (!userId) return;
      const channel = await storage.getChannel(channelId);
      if (!channel || (isStaffChannel(channel.name) && !socket.rooms.has(STAFF_ROOM))) return;
      const room = isStaffChannel(channel.name) ? STAFF_ROOM : SERVER_ROOM;
      socket.to(room).emit("member:typing", { userId, channelId, typing: false });
    });

    socket.on("disconnect", async () => {
      const userId = socket.data.userId;
      if (!userId || connectedUsers.get(userId) !== socket.id) return;
      connectedUsers.delete(userId);
      await storage.updateUserStatus(userId, "offline");
      io.to(SERVER_ROOM).emit("member:status", { userId, status: "offline" });
    });
  });

  return httpServer;
}

function ioFor(app: Express): SocketServer | undefined {
  return app.get("chatIo") as SocketServer | undefined;
}