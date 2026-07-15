import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { tokenCache } from "@/lib/token-cache";
import { FeedbackButton } from "@/components/feedback-button";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY — copy it from apps/web/.env.local (see .env.example).");
}

function RootContent() {
  const { isSignedIn } = useAuth();
  return (
    <>
      <Slot />
      {isSignedIn ? <FeedbackButton /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <RootContent />
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
