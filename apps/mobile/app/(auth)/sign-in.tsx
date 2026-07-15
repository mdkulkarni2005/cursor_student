import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSSO, useSignIn } from "@clerk/clerk-expo";

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
      <Text style={styles.title}>StudentOS</Text>
      <Text style={styles.subtitle}>Reports, PPTs, resumes, and more — same account as the web app.</Text>

      <Pressable style={[styles.button, styles.googleButton]} onPress={onGoogle} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue with Google</Text>}
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Pressable style={[styles.button, styles.emailButton]} onPress={onEmailSignIn} disabled={busy || !email || !password}>
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 32 },
  button: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  googleButton: { backgroundColor: "#111" },
  emailButton: { backgroundColor: "#2563eb" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e5e5e5" },
  dividerText: { marginHorizontal: 10, color: "#999", fontSize: 12 },
  input: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 12, marginTop: 10, fontSize: 15 },
});
