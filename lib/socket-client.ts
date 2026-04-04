import io, { Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { parseCookieBlob } from './axios';

const SOCKET_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
const BETTER_AUTH_COOKIE_KEY = 'better-auth_cookie';

let socket: Socket | null = null;

/** Parse the JSON blob stored by @better-auth/expo into a Cookie header string */

export async function initSocket(): Promise<Socket> {
  if (socket && socket.connected) {
    return socket;
  }

  try {
    // Get the Better Auth cookie blob (same source as axios)
    const cookieBlob = await SecureStore.getItemAsync(BETTER_AUTH_COOKIE_KEY);
    const cookieHeader = parseCookieBlob(cookieBlob);

    socket = io(SOCKET_URL, {
      // Send cookies as headers (same as HTTP requests)
      extraHeaders: {
        Cookie: cookieHeader,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection Error:', error);
    });

    return socket;
  } catch (error) {
    console.error('[Socket] Init Error:', error);
    throw error;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
