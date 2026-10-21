import { Hono } from "hono";
import { ChatRoom } from "./chat-room";

// durable object classes must be exported from the worker entry
export { ChatRoom };

type Env = {
  Bindings: {
    CHAT_ROOM: DurableObjectNamespace;
  };
};

const app = new Hono<Env>();

app.get("/api/health", (c) => c.json({ ok: true }));

// websocket endpoint: /api/ws?room=main
app.get("/api/ws", (c) => {
  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("expected websocket", 426);
  }
  const room = c.req.query("room") ?? "main";
  const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName(room));
  return stub.fetch(c.req.raw);
});

// port your other express routes here, e.g.
// app.get("/api/whatever", (c) => c.json({ ... }));

export default app;
