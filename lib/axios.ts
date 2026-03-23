import axios from "axios";
import * as SecureStore from "expo-secure-store";

// Use your backend IP (avoid localhost for physical devices)
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// ─── How @better-auth/expo stores the session ───────────────────────────────
// The expoClient plugin does NOT store a plain bearer token.
// It stores ALL cookies as a JSON blob under this key, e.g.:
//   { "better-auth.session_token": { value: "abc123", expires: "..." } }
// We must parse that blob and rebuild the Cookie header string.
// ─────────────────────────────────────────────────────────────────────────────
const BETTER_AUTH_COOKIE_KEY = "better-auth_cookie";

/** Parse the JSON blob stored by @better-auth/expo into a Cookie header string */
function parseCookieBlob(blob: string | null): string {
    if (!blob) return "";
    try {
        const parsed: Record<string, { value: string; expires: string | null }> =
            JSON.parse(blob);
        return Object.entries(parsed)
            .filter(([, v]) => {
                // Drop expired cookies
                if (v.expires && new Date(v.expires) < new Date()) return false;
                return true;
            })
            .map(([k, v]) => `${k}=${v.value}`)
            .join("; ");
    } catch {
        return "";
    }
}

const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor: Rebuilds & injects the Better Auth session cookie
apiClient.interceptors.request.use(
    async (config) => {
        const blob = await SecureStore.getItemAsync(BETTER_AUTH_COOKIE_KEY);
        const cookieHeader = parseCookieBlob(blob);
        if (cookieHeader) {
            // Send as Cookie header — this is what the auth guard expects
            config.headers["Cookie"] = cookieHeader;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


// Response Interceptor: Handles 401 Unauthorized globally
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.error("Session expired or invalid.");
        }
        return Promise.reject(error);
    }
);

export default apiClient;