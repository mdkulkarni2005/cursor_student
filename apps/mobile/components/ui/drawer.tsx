import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Dimensions, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { colors, font, radius, spacing } from "@/lib/theme";
import {
  CreditCardIcon,
  GearIcon,
  GridIcon,
  InboxIcon,
  LifeBuoyIcon,
  LogOutIcon,
  SearchIcon,
  ToolIcon,
  UserCircleIcon,
} from "@/components/icons";

type DrawerContextValue = { open: () => void; close: () => void };
const DrawerContext = createContext<DrawerContextValue | null>(null);

export function useDrawer(): DrawerContextValue {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useDrawer must be used within a DrawerProvider");
  return ctx;
}

const WIDTH = Math.min(320, Dimensions.get("window").width * 0.84);

type NavItem = { label: string; href: string; icon: (p: { size?: number; color?: string }) => ReactNode; showIf?: boolean };

export function DrawerProvider({ children, showBranchTools }: { children: ReactNode; showBranchTools: boolean }) {
  const [visible, setVisible] = useState(false);
  const translateX = useRef(new Animated.Value(-WIDTH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  const open = useCallback(() => {
    setVisible(true);
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [translateX, backdrop]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: -WIDTH, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [translateX, backdrop]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href as never);
    },
    [close],
  );

  const items: NavItem[] = useMemo(
    () => [
      { label: "Messages", href: "/messages", icon: InboxIcon },
      { label: "Workspace", href: "/workspace", icon: GridIcon },
      { label: "Branch Tools", href: "/branch-tools", icon: ToolIcon, showIf: showBranchTools },
      { label: "Profile", href: "/profile", icon: UserCircleIcon },
      { label: "Search", href: "/search", icon: SearchIcon },
      { label: "Plans & Billing", href: "/plans", icon: CreditCardIcon },
      { label: "Support", href: "/support", icon: LifeBuoyIcon },
      { label: "Settings", href: "/(app)/settings", icon: GearIcon },
    ],
    [showBranchTools],
  );

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]} />
          </Pressable>
          <Animated.View style={[styles.panel, { width: WIDTH, paddingTop: insets.top + spacing.lg, transform: [{ translateX }] }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
              <Text style={styles.brand}>xSquare</Text>
              <View style={{ height: spacing.md }} />
              {items
                .filter((it) => it.showIf !== false)
                .map((it) => (
                  <Pressable key={it.href} style={styles.row} onPress={() => go(it.href)}>
                    <View style={styles.rowIcon}>{it.icon({ size: 18, color: colors.ink })}</View>
                    <Text style={styles.rowLabel}>{it.label}</Text>
                  </Pressable>
                ))}
              <View style={styles.divider} />
              <Pressable
                style={styles.row}
                onPress={() => {
                  close();
                  signOut();
                }}
              >
                <View style={styles.rowIcon}>
                  <LogOutIcon size={18} color={colors.danger} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.danger }]}>Sign out</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.4)" },
  panel: { position: "absolute", top: 0, bottom: 0, left: 0, backgroundColor: colors.base, paddingHorizontal: spacing.lg, borderRightWidth: 1, borderRightColor: colors.line },
  brand: { fontFamily: font.display, fontSize: 20, color: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowIcon: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: colors.cyanTint, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontFamily: font.sansMedium, fontSize: 15, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.sm },
});
