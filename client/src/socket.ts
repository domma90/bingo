import { io, Socket } from 'socket.io-client';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.DEV ? '' : window.location.origin);

const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export default socket;
