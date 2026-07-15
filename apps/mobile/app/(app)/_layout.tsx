import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useApiClient } from "@/lib/api";

export default function AppLayout() {
  const { isSignedIn } = useAuth();
  const client = useApiClient();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    client
      .me()
      .then((me) => setOnboarded(me.onboarded))
      .catch(() => setOnboarded(false));
  }, [isSignedIn, client]);

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (onboarded === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="vault" options={{ title: "Vault" }} />
      <Tabs.Screen name="assistant" options={{ title: "Assistant" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
