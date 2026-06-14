import io, { Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { parseCookieBlob } from './axios';

const SOCKET_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
const BETTER_AUTH_COOKIE_KEY = 'better-auth_cookie';

let socket: Socket | null = null;

/** Parse the JSON blob stored by @better-auth/expo into a Cookie header string */

export async function initSocket(): Promise<Socket> {
  if (socket && socket.connected) {
    console.log('[Socket] Already connected, reusing:', socket.id);
    return socket;
  }

  try {
    // Get the Better Auth cookie blob (same source as axios)
    const cookieBlob = await SecureStore.getItemAsync(BETTER_AUTH_COOKIE_KEY);
    const cookieHeader = parseCookieBlob(cookieBlob);

    let sessionToken = "";
    if (cookieBlob) {
      try {
        const parsed = JSON.parse(cookieBlob);
        sessionToken = parsed["better-auth.session_token"]?.value || "";
      } catch (e) {}
    }

    console.log('[Socket] Connecting to:', SOCKET_URL);
    console.log('[Socket] Auth cookie present:', !!cookieHeader);
    console.log('[Socket] Auth token present:', !!sessionToken);

    socket = io(SOCKET_URL, {
      // Send cookies as headers (same as HTTP requests)
      extraHeaders: {
        Cookie: cookieHeader,
      },
      auth: {
        token: sessionToken,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: ['websocket'],
      forceNew: false,
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('[Socket] ❌ Connection timeout after 10s');
        reject(new Error('Socket connection timeout'));
      }, 10000);

      socket!.on('connect', () => {
        clearTimeout(timeout);
        console.log('[Socket] ✅ Connected:', socket?.id);
        resolve(socket!);
      });

      socket!.on('disconnect', () => {
        console.log('[Socket] 🔌 Disconnected');
      });

      socket!.on('connect_error', (error) => {
        console.error('[Socket] ❌ Connection Error:', error);
        if (timeout) clearTimeout(timeout);
        reject(error);
      });

      socket!.on('error', (error) => {
        console.error('[Socket] ❌ Socket Error:', error);
      });
    });
  } catch (error) {
    console.error('[Socket] ❌ Init Error:', error);
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
