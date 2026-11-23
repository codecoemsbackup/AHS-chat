import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production"
    ? {
        directives: {
          "default-src": ["'self'"],
          "base-uri": ["'self'"],
          "connect-src": ["'self'", "ws:", "wss:"],
          "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
          "form-action": ["'self'"],
          "frame-ancestors": ["'none'"],
          "img-src": ["'self'", "https:", "data:"],
          "object-src": ["'none'"],
          "script-src": ["'self'"],
          "script-src-attr": ["'none'"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        },
      }
    : false,
  crossOriginEmbedderPolicy: false,
}));

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: "12mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  await storage.ensureDmSchema();
  await storage.ensureFriendsAndGroupChatsSchema();
  await storage.ensureUploadsSchema();
  await storage.ensureCustomStatusSchema();
  await storage.ensureDoNotDisturbSchema();
  await storage.ensureAppearanceSchema();
  await storage.ensurePollsSchema();
  await storage.ensureMessageReactionsSchema();
  await storage.ensureMessagePaginationIndexes();
  await storage.ensureServer();
  if (process.env.MESSAGE_ARCHIVE_DIR) {
    await storage.archiveOverflowingChannelMessages();
  } else {
    console.warn(
      "MESSAGE_ARCHIVE_DIR is not configured; channel archiving will stop new posts once a channel reaches 500 database messages.",
    );
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
