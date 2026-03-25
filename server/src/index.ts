import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { registerHandlers } from './socketHandlers';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
const defaultUrl = railwayDomain ? `https://${railwayDomain}` : `http://localhost:${PORT}`;
const SERVER_URL = process.env.SERVER_URL ?? defaultUrl;

// In production client and server share the same origin, so allow all same-origin + dev client
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [SERVER_URL]
  : [SERVER_URL, 'http://localhost:5173'];

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: allowedOrigins }));
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
});
