import * as SecureStore from "expo-secure-store";
import type { TokenCache } from "@clerk/clerk-expo";

// Clerk Expo needs a persistent token cache so a session survives an app restart —
// this is what makes "sign in once, stay signed in" work on mobile.
export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      /* ignore — worst case the user re-authenticates */
    }
  },
};
