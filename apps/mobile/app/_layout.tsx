import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { tokenCache } from "@/lib/token-cache";
import { FeedbackButton } from "@/components/feedback-button";
import { colors } from "@/lib/theme";

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
  // Matches web's Inter typography (see apps/web/app/globals.css --font-display/--font-sans).
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.cyan} />
      </View>
    );
  }

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
