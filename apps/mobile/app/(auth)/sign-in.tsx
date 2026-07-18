import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, BackHandler, Pressable, StyleSheet, Text, TextInput, ToastAndroid, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSSO, useSignIn } from "@clerk/clerk-expo";
import { colors, font, radius, spacing } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { FadeIn } from "@/components/ui/fade-in";

// Required once by Clerk Expo so the OAuth browser session completes and returns to the app.
WebBrowser.maybeCompleteAuthSession();

/**
 * Google OAuth (primary path — matches web) + email/password fallback, both against the SAME
 * Clerk instance as apps/web (same EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY). A student who signed up
 * on web lands in the exact same account here — no separate mobile account, nothing to link.
 *
 * No dashboard "native application" entry is needed — Clerk's Google connection already points
 * at its own hosted callback (https://<your-domain>/v1/oauth_callback), same as web. The only
 * mobile-specific piece is telling Clerk where to send the browser AFTER that: `redirectUrl`
 * below, built from this app's `scheme` (see app.json) via expo-auth-session. Without it, the
 * system browser finishes the Google flow but never hands control back to the app.
 */
export default function SignInScreen() {
  const { startSSOFlow } = useSSO();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // This is the root of the (auth) stack — there's no in-app screen to go "back" to, so a single
  // hardware back press exited the whole app outright (jarring on Android, and if a keyboard was
  // up it looked like the keyboard-dismiss got skipped). Standard Android pattern instead:
  // first press just warns, a second press within 2s actually exits.
  const exitArmedAt = useRef(0);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (Date.now() - exitArmedAt.current < 2000) return false;
      exitArmedAt.current = Date.now();
      ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, []);

  const onGoogle = useCallback(async () => {
    setBusy(true);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: "studentos", path: "oauth-native-callback" });
      const { createdSessionId, setActive: setActiveSSO } = await startSSOFlow({ strategy: "oauth_google", redirectUrl });
      if (createdSessionId && setActiveSSO) await setActiveSSO({ session: createdSessionId });
    } catch (err) {
      Alert.alert("Sign-in failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }, [startSSOFlow]);

  const onEmailSignIn = useCallback(async () => {
    if (!isLoaded) return;
    setBusy(true);
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
      } else {
        Alert.alert("Almost there", "Additional verification is required — please finish sign-in on the web app.");
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "errors" in err
          ? String((err as { errors?: { message?: string }[] }).errors?.[0]?.message ?? "Sign-in failed.")
          : "Sign-in failed.";
      Alert.alert("Sign-in failed", message);
    } finally {
      setBusy(false);
    }
  }, [isLoaded, signIn, setActive, email, password]);

  return (
    <View style={styles.container}>
      <FadeIn>
        <Logo size={72} />
        <Text style={styles.title}>StudentOS</Text>
        <Text style={styles.subtitle}>Reports, PPTs, resumes, and more — same account as the web app.</Text>

        <Button label="Continue with Google" onPress={onGoogle} disabled={busy} loading={busy} style={styles.googleButton} />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.faint}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.faint}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button
        label="Sign in"
        onPress={onEmailSignIn}
        disabled={busy || !email || !password}
        style={styles.emailButton}
        variant="secondary"
      />

        <Pressable style={styles.signUpLink} onPress={() => router.push("/(auth)/sign-up")}>
          <Text style={styles.signUpLinkText}>New here? Create an account</Text>
        </Pressable>
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl, backgroundColor: colors.canvas },
  title: { fontSize: 28, fontFamily: font.display, color: colors.ink, textAlign: "center", marginTop: 12, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: font.sans, color: colors.muted, textAlign: "center", marginBottom: 32 },
  googleButton: { marginTop: 12 },
  emailButton: { marginTop: 12 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { marginHorizontal: 10, color: colors.faint, fontSize: 12, fontFamily: font.sans },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, padding: 12, marginTop: 10, fontSize: 15, fontFamily: font.sans, color: colors.ink, backgroundColor: colors.input },
  signUpLink: { marginTop: 20, alignItems: "center" },
  signUpLinkText: { fontSize: 13, fontFamily: font.sansMedium, color: colors.cyan },
});
