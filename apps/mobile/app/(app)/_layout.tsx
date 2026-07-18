import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useApiClient } from "@/lib/api";
import { colors, font, radius, spacing } from "@/lib/theme";
import { ArchiveIcon, ChatIcon, GearIcon, HomeIcon, MenuIcon } from "@/components/icons";
import { DrawerProvider, useDrawer } from "@/components/ui/drawer";

function HamburgerButton() {
  const { open } = useDrawer();
  return (
    <Pressable onPress={open} hitSlop={12} style={{ paddingHorizontal: spacing.md }}>
      <MenuIcon size={22} color={colors.ink} />
    </Pressable>
  );
}

export default function AppLayout() {
  const { isSignedIn } = useAuth();
  const client = useApiClient();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [branchFeatures, setBranchFeatures] = useState<string[]>([]);
  // Separate from `onboarded === null` (still loading) — a failed /me check must NOT be treated
  // as "not onboarded", or a real account with onboardedAt already set gets bounced back into
  // onboarding every time the network hiccups.
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setLoadError(false);
    setOnboarded(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    client
      .me()
      .then((me) => {
        if (!cancelled) {
          setOnboarded(me.onboarded);
          setBranchFeatures(me.capabilities.branchFeatures);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, client, attempt]);

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  if (loadError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas, padding: spacing.xl }}>
        <Text style={{ fontFamily: font.displaySemibold, fontSize: 17, color: colors.ink, marginBottom: spacing.xs, textAlign: "center" }}>
          Couldn't reach StudentOS
        </Text>
        <Text style={{ fontFamily: font.sans, fontSize: 14, color: colors.muted, marginBottom: spacing.lg, textAlign: "center" }}>
          We couldn't load your account. Check your connection and try again.
        </Text>
        <Pressable
          onPress={retry}
          style={{ backgroundColor: colors.cyan, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: spacing.xl }}
        >
          <Text style={{ fontFamily: font.sansSemibold, fontSize: 15, color: colors.onAccent }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (onboarded === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.cyan} />
      </View>
    );
  }
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <DrawerProvider showBranchTools={branchFeatures.length > 0}>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: colors.cyan,
          tabBarInactiveTintColor: colors.faint,
          headerLeft: () => <HamburgerButton />,
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <HomeIcon size={21} color={color as string} /> }} />
        <Tabs.Screen name="vault" options={{ title: "Vault", tabBarIcon: ({ color }) => <ArchiveIcon size={21} color={color as string} /> }} />
        <Tabs.Screen name="assistant" options={{ title: "Assistant", tabBarIcon: ({ color }) => <ChatIcon size={21} color={color as string} /> }} />
        <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <GearIcon size={21} color={color as string} /> }} />
      </Tabs>
    </DrawerProvider>
  );
}
