import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  // DO NOT change the path; Caddy forwards requests to this service by port.
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const connectedClients = new Set<string>();

// This service reports audience counts only. It deliberately does not invent,
// replay, or periodically broadcast sample news updates. Live events must come
// from an authenticated editorial publishing workflow.
io.on("connection", (socket) => {
  connectedClients.add(socket.id);
  console.log(`[live-blog] client connected (${socket.id}) — ${connectedClients.size} online`);

  socket.emit("viewer-count", connectedClients.size);
  io.emit("viewer-count", connectedClients.size);

  socket.on("disconnect", () => {
    connectedClients.delete(socket.id);
    io.emit("viewer-count", connectedClients.size);
    console.log(`[live-blog] client disconnected (${socket.id}) — ${connectedClients.size} online`);
  });

  socket.on("error", (error) => {
    console.error(`[live-blog] socket error (${socket.id}):`, error);
  });
});

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[live-blog] audience-count service running on port ${PORT}; sample broadcasts disabled`);
});

process.on("SIGTERM", () => {
  console.log("[live-blog] SIGTERM, shutting down…");
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("[live-blog] SIGINT, shutting down…");
  httpServer.close(() => process.exit(0));
});
