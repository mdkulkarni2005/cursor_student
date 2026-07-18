import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { tokenCache } from "@/lib/token-cache";
import { colors, font } from "@/lib/theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY — copy it from apps/web/.env.local (see .env.example).");
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
          {/*
            A real Stack navigator (not `<Slot/>`) is required at the root: it's what makes every
            child route's `<Stack.Screen options={{ title, headerRight }}>` calls actually render a
            header. Without an ancestor Stack, those options are silently ignored — the tool screens
            (assignments/reports/ppt/resume/lab-reports/projects) rendered with no header/back button
            at all. (app)/(auth)/onboarding/oauth-callback manage their own chrome, so they opt out.
          */}
          <Stack
            screenOptions={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.base },
              headerShadowVisible: false,
              headerTintColor: colors.ink,
              headerTitleStyle: { fontFamily: font.displaySemibold, fontSize: 17, color: colors.ink },
              headerBackTitle: "",
              contentStyle: { backgroundColor: colors.canvas },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="oauth-native-callback" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
