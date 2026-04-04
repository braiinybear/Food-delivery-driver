export interface RegisterPushTokenRequest {
  token: string | null;
}

export interface RegisterPushTokenResponse {
  message?: string; // optional (backend may not return anything)
}


export interface UpdatePushTokenRequest {
   token: string | null; // 🔥 null = unregister
}

export interface UpdatePushTokenResponse {
  message?: string;
}