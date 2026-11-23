import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { User } from "@shared/schema";

const scrypt = promisify(scryptCallback);
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(key, "hex");
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

export function createLocalSessionUser(user: User) {
  return {
    localAuth: true,
    claims: { sub: user.id, username: user.username },
    expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  const sessionMiddleware = getSession();
  app.set("sessionMiddleware", sessionMiddleware);
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/logout", (req, res, next) => {
    req.logout((error) => {
      if (error) return next(error);
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const user = req.user as ReturnType<typeof createLocalSessionUser> | undefined;

  if (
    !req.isAuthenticated() ||
    user?.localAuth !== true ||
    !user.claims.sub ||
    !user.expires_at
  ) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return next();
};
