import { usePartnerStore } from "@/store/userider";
import { useSocketStore } from "@/store/useSocketStore";
import * as SecureStore from 'expo-secure-store';

/**
 * Centrally clears all cached and persisted user session state
 * to ensure subsequent logins do not leak stale data.
 */
export async function clearUserSessionState(queryClient?: any) {
  try {
    console.log("🧹 Clearing all persistent driver user session data...");

    // 1. Clear Partner (Rider) Store
    usePartnerStore.setState({ appliedForRider: false });
    await SecureStore.deleteItemAsync('rider-store').catch(() => {});

    // 2. Clear Socket Store
    useSocketStore.getState().reset();

    // 3. Clear Auth Session Tokens / Cookies
    await SecureStore.deleteItemAsync('token').catch(() => {});
    await SecureStore.deleteItemAsync('better-auth_cookie').catch(() => {});

    // 3.5. Clear Saved Theme preference
    await SecureStore.deleteItemAsync('user-theme').catch(() => {});

    // 4. Clear React Query Cache if provided
    if (queryClient) {
      queryClient.clear();
      console.log("✅ React Query cache cleared successfully!");
    }
    
    console.log("✅ All driver user session states wiped clean!");
  } catch (error) {
    console.error("❌ Error during user session cleanup:", error);
  }
}
