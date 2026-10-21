import { ChatRoom } from "./chat-room";
 
// durable object classes must be exported from the worker entry
export { ChatRoom };
 
interface Env {
  CHAT_ROOM: DurableObjectNamespace;
}
 
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
 
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true });
    }
 
    // websocket endpoint: /api/ws?room=main
    if (url.pathname === "/api/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("expected websocket", { status: 426 });
      }
      const room = url.searchParams.get("room") ?? "main";
      const stub = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(room));
      return stub.fetch(request);
    }
 
    return new Response("not found", { status: 404 });
  },
};
 
