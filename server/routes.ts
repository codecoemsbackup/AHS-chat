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
} from "./replitAuth";
import {
  insertServerMessageSchema,
  updateUsernameSchema,
  updateChannelSchema,
  updateAdminSchema,
  updateAdminDelegationSchema,
  banUserSchema,
  localSignupSchema,
  localLoginSchema,
} from "@shared/schema";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_AVATAR_BYTES,
  UPLOAD_ROOT,
  removeLocalUpload,
  saveUpload,
} from "./fileUploads";

const SERVER_ROOM = "server:main";
const connectedUsers = new Map<string, string>();

function publicUser(user: any) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return {
    ...safeUser,
    status: safeUser.status === "online" ? "online" : "offline",
  };
}

function userIdFromRequest(req: any): string {
  return req.user.claims.sub;
}

async function activeUser(req: any, res: Response) {
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


export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  app.use("/uploads", express.static(UPLOAD_ROOT, { maxAge: "1h" }));

  app.get("/api/auth/username-available", async (req: any, res: Response) => {
    const username = String(req.query.username || "").trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.json({
        available: false,
        reason: "Use 3-20 letters, numbers, or underscores.",
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
      const user = await storage.createLocalUser(
        parsed.username,
        await hashPassword(parsed.password),
      );
      await new Promise<void>((resolve, reject) => {
        req.login(createLocalSessionUser(user), (error: any) =>
          error ? reject(error) : resolve(),
        );
      });
      res.status(201).json(publicUser(user));
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
      res.json(publicUser(user));
    } catch (error: any) {
      sendError(res, error, "Failed to sign in");
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res: Response) => {
    try {
      await storage.ensureServer();
      const user = await activeUser(req, res);
      if (user) res.json(publicUser(user));
    } catch (error) {
      sendError(res, error, "Failed to fetch user", 500);
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
      res.json(publicUser(await storage.updateUsername(actor.id, parsed.username)));
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
      await removeLocalUpload(actor.profileImageUrl);
      ioFor(app)?.to(SERVER_ROOM).emit("member:updated", publicUser(user));
      res.json(publicUser(user));
    } catch (error: any) {
      sendError(res, error, "Failed to update profile picture");
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
      const apiKey = process.env.TENOR_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: "GIF search is not configured" });
      }

      const query = String(req.query.q || "").trim().slice(0, 100);
      const endpoint = query
        ? "https://tenor.googleapis.com/v2/search"
        : "https://tenor.googleapis.com/v2/featured";
      const url = new URL(endpoint);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("client_key", "ahs-chat");
      url.searchParams.set("limit", "24");
      url.searchParams.set("media_filter", "gif,tinygif");
      if (query) url.searchParams.set("q", query);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Tenor returned ${response.status}`);
      }
      const payload = (await response.json()) as {
        results?: Array<{
          id?: string;
          content_description?: string;
          media_formats?: Record<
            string,
            { url?: string; dims?: [number, number] }
          >;
        }>;
        next?: string;
      };
      const gifs = (payload.results || [])
        .map((result) => {
          const formats = result.media_formats || {};
          const media = formats.gif || formats.mediumgif || formats.tinygif;
          const preview = formats.tinygif || media;
          if (!result.id || !media?.url || !preview?.url) return null;
          return {
            id: result.id,
            title: result.content_description || "Tenor GIF",
            url: media.url,
            previewUrl: preview.url,
            width: media.dims?.[0] || 240,
            height: media.dims?.[1] || 180,
          };
        })
        .filter(Boolean);
      res.json({ gifs, next: payload.next || null });
    } catch (error: any) {
      sendError(res, error, "Failed to search GIFs", 502);
    }
  });

  app.post("/api/gifs/import", isAuthenticated, async (req: any, res: Response) => {
    try {
      if (!(await activeUser(req, res))) return;
      const sourceUrl = new URL(String(req.body?.url || ""));
      if (
        sourceUrl.protocol !== "https:" ||
        (sourceUrl.hostname !== "tenor.com" && !sourceUrl.hostname.endsWith(".tenor.com"))
      ) {
        return res.status(400).json({ message: "Only Tenor GIFs can be imported" });
      }

      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`Tenor returned ${response.status}`);
      const contentType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
      if (!["image/gif", "image/webp", "image/jpeg", "image/png"].includes(contentType)) {
        return res.status(400).json({ message: "That Tenor result is not an image" });
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0 || buffer.length > MAX_ATTACHMENT_BYTES) {
        return res.status(400).json({ message: "That GIF is larger than 8 MB" });
      }
      const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
      const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
      const upload = await saveUpload(dataUrl, `tenor-gif.${extension}`, {
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
    res.json({ server, channels, members: members.map(publicUser) });
    } catch (error) {
      sendError(res, error, "Failed to fetch server", 500);
    }
  });

  app.post("/api/channels", isAuthenticated, async (req: any, res: Response) => {
    try {
      if (!(await adminUser(req, res))) return;
      const parsed = updateChannelSchema.parse(req.body);
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
        res.json(publicUser(user));
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
        ioFor(app)?.to(SERVER_ROOM).emit("member:updated", publicUser(user));
        res.json(publicUser(user));
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
        res.json(publicUser(user));
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
        ioFor(app)?.to(SERVER_ROOM).emit("member:updated", {
          ...target,
          isBanned: true,
          banReason: parsed.reason || null,
        });
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
        if (!(await activeUser(req, res))) return;
        const channel = await storage.getChannel(req.params.channelId);
        if (!channel || channel.serverId !== "main") {
          return res.status(404).json({ message: "Channel not found" });
        }
        res.json(await storage.getChannelMessages(channel.id));
      } catch (error) {
        sendError(res, error, "Failed to fetch messages", 500);
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
        await storage.deleteMessage(req.params.messageId, actor.id);
        ioFor(app)?.to(SERVER_ROOM).emit("message:deleted", {
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
        const adminOnlyChannel = ["rules", "announcements"].includes(
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
        const members = await storage.getMembers();
        const validMentionUserIds = Array.from(new Set(parsed.mentionUserIds)).filter(
          (mentionedUserId) =>
            mentionedUserId !== userId &&
            members.some((member) => member.id === mentionedUserId && !member.isBanned),
        );
        const message = await storage.createMessage({
          ...parsed,
          mentionUserIds: validMentionUserIds,
          senderId: userId,
        });
        io.to(SERVER_ROOM).emit("message:receive", message);
        for (const mentionedUserId of validMentionUserIds) {
          const mentionedSocketId = connectedUsers.get(mentionedUserId);
          if (mentionedSocketId) {
            io.to(mentionedSocketId).emit("mention:received", {
              channelId: parsed.channelId,
              messageId: message.id,
            });
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message:error", { error: "Failed to send message" });
      }
    });

    socket.on("typing:start", ({ channelId }: { channelId: string }) => {
      const userId = socket.data.userId;
      if (userId) socket.to(SERVER_ROOM).emit("member:typing", { userId, channelId, typing: true });
    });

    socket.on("typing:stop", ({ channelId }: { channelId: string }) => {
      const userId = socket.data.userId;
      if (userId) socket.to(SERVER_ROOM).emit("member:typing", { userId, channelId, typing: false });
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