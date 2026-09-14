import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Pool of live updates to broadcast on a timer
const pool: Array<{
  title: string;
  body: string;
  author: string;
  tag: string;
  highlight?: boolean;
}> = [
  {
    title: "House Speaker Delgado schedules floor vote for Thursday",
    body: "In a statement released moments ago, the Speaker's office said the infrastructure bill will come to the House floor Thursday afternoon, with a Rules Committee hearing Wednesday evening.",
    author: "Eleanor Whitfield",
    tag: "Breaking",
    highlight: true,
  },
  {
    title: "Treasury announces $55B water-pipe replacement fund",
    body: "The department will begin accepting applications from states next month for the lead-pipe replacement program, one of the bill's marquee public-health provisions.",
    author: "Robert Kingsley",
    tag: "Implementation",
  },
  {
    title: "Construction industry groups hail 'decade-defining' investment",
    body: "The Associated General Contractors called the bill 'the most significant federal commitment to the built environment in a generation,' projecting 600,000 new jobs over five years.",
    author: "Terrence Mallow",
    tag: "Reaction",
  },
  {
    title: "Progressive caucus demands climate package move 'in lockstep'",
    body: "A letter signed by 38 House members warns they will not support the infrastructure bill without a parallel vote on the broader climate and social-spending package.",
    author: "Daniel Park",
    tag: "What's next",
  },
  {
    title: "Markets open higher on infrastructure optimism; construction stocks lead",
    body: "Futures pointed to a sharply higher open, with cement, steel, and engineering firms among the biggest pre-market gainers.",
    author: "Robert Kingsley",
    tag: "Markets",
  },
  {
    title: "Governors of both parties welcome the funding, jockey for early grants",
    body: "State officials are already assembling project lists to submit once the Treasury opens the application portal, several told The Daily Post.",
    author: "Eleanor Whitfield",
    tag: "On the ground",
  },
];

let poolIndex = 0;
const connectedClients = new Set<string>();

function nextUpdate() {
  const item = pool[poolIndex % pool.length];
  poolIndex++;
  return {
    id: `srv-${Date.now()}`,
    time: "just now",
    timestamp: new Date().toISOString(),
    ...item,
  };
}

io.on("connection", (socket) => {
  connectedClients.add(socket.id);
  console.log(`[live-blog] client connected (${socket.id}) — ${connectedClients.size} online`);

  // Send a welcome event with current viewer count
  socket.emit("viewer-count", connectedClients.size);
  io.emit("viewer-count", connectedClients.size);

  socket.on("request-update", () => {
    // Send the next update only to the requesting client (optional pattern)
    socket.emit("live-update", nextUpdate());
  });

  socket.on("disconnect", () => {
    connectedClients.delete(socket.id);
    io.emit("viewer-count", connectedClients.size);
    console.log(`[live-blog] client disconnected (${socket.id}) — ${connectedClients.size} online`);
  });

  socket.on("error", (error) => {
    console.error(`[live-blog] socket error (${socket.id}):`, error);
  });
});

// Broadcast a new live update to all connected clients every 45 seconds
const BROADCAST_INTERVAL_MS = 45000;
setInterval(() => {
  if (connectedClients.size > 0) {
    const update = nextUpdate();
    io.emit("live-update", update);
    console.log(`[live-blog] broadcast "${update.title.slice(0, 40)}…" to ${connectedClients.size} clients`);
  }
}, BROADCAST_INTERVAL_MS);

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[live-blog] WebSocket server running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("[live-blog] SIGTERM, shutting down…");
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("[live-blog] SIGINT, shutting down…");
  httpServer.close(() => process.exit(0));
});
