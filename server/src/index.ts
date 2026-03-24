import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { registerHandlers } from './socketHandlers';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
const SERVER_URL = process.env.SERVER_URL ?? `http://localhost:${PORT}`;

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [CLIENT_URL, SERVER_URL],
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: [CLIENT_URL, SERVER_URL] }));
app.use(express.json());

// Serve built client in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

io.on('connection', (socket) => {
  registerHandlers(io, socket, SERVER_URL);
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server URL: ${SERVER_URL}`);
  console.log(`Expecting client at: ${CLIENT_URL}`);
});
