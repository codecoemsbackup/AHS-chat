import { DurableObject } from "cloudflare:workers";

type ChatMessage = {
  id: string;
  user: string;
  text: string;
  ts: number;
};

const MAX_HISTORY = 100;

export class ChatRoom extends DurableObject {
  async fetch(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // hibernation api: the object can sleep between messages
    this.ctx.acceptWebSocket(server);

    const history =
      (await this.ctx.storage.get<ChatMessage[]>("history")) ?? [];
    server.send(JSON.stringify({ type: "history", messages: history }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(_ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string") return;

    let data: { user?: unknown; text?: unknown };
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    const text = String(data.text ?? "").trim().slice(0, 2000);
    if (!text) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      user: String(data.user ?? "anon").slice(0, 32),
      text,
      ts: Date.now(),
    };

    const history =
      (await this.ctx.storage.get<ChatMessage[]>("history")) ?? [];
    history.push(msg);
    await this.ctx.storage.put("history", history.slice(-MAX_HISTORY));

    const payload = JSON.stringify({ type: "message", message: msg });
    for (const socket of this.ctx.getWebSockets()) {
      socket.send(payload);
    }
  }

  async webSocketClose(ws: WebSocket) {
    ws.close(1000, "closed");
  }
}
