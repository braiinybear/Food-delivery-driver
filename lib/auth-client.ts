import { expoClient } from "@better-auth/expo/client";
import { phoneNumberClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import * as SecureStore from "expo-secure-store";
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const authClient = createAuthClient({
  // ⚡ URL of your NestJS backend (use your machine's IP for physical devices)
  baseURL: API_URL,
  user: {
    additionalFields: {
      referralCode: {
        type: "string",
      },
      referredById: {
        type: "string",
      },
    },
  },
  plugins: [
    expoClient({
      storage: SecureStore, // Encrypted persistence
      scheme: "food-delivery-customer",
    }),
    phoneNumberClient(),
  ],
});




