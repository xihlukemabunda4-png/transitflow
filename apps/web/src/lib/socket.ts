import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './config';

let socket: Socket | null = null;

export function getLiveSocket(): Socket {
  if (!socket) {
    socket = io(`${API_BASE_URL}/live`, { transports: ['websocket'] });
  }
  return socket;
}
