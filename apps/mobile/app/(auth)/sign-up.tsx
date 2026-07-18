import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { colors, font, radius, spacing } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { FadeIn } from "@/components/ui/fade-in";

function clerkMessage(err: unknown, fallback: string): string {
  return err && typeof err === "object" && "errors" in err
    ? String((err as { errors?: { message?: string }[] }).errors?.[0]?.message ?? fallback)
    : fallback;
}

type Strength = { score: 0 | 1 | 2 | 3; label: string; color: string };

// Same 4-tier heuristic as most password meters (length + character variety) — no external
// library needed for something this small. Gates "Create account" at score >= 1 (Fair) so a
// bare "password"-style entry can't get submitted, without being so strict it blocks reasonable
// student passwords Clerk itself would accept.
function passwordStrength(password: string): Strength {
  if (!password) return { score: 0, label: "", color: colors.lineStrong };
  const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
  if (password.length < 8) return { score: 0, label: "Weak", color: colors.danger };
  if (password.length < 10 || variety < 2) return { score: 1, label: "Fair", color: colors.warning };
  if (password.length < 12 || variety < 3) return { score: 2, label: "Good", color: colors.teal };
  return { score: 3, label: "Strong", color: colors.success };
}

/**
 * Email/password account creation — previously mobile only had a sign-IN form with no way to
 * create an account (see (auth)/sign-in.tsx's onEmailSignIn, which calls signIn.create and
 * always fails for a brand-new email). Google OAuth already auto-provisions a Clerk account on
 * first login; this is the equivalent path for students who type an email/password instead,
 * mirroring apps/web's <SignUp /> (email + password, then a one-time email code).
 */
export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [busy, setBusy] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  const onCreate = useCallback(async () => {
    if (!isLoaded) return;
    setBusy(true);
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      Alert.alert("Couldn't create account", clerkMessage(err, "Please try again."));
    } finally {
      setBusy(false);
    }
  }, [isLoaded, signUp, email, password]);

  const onVerify = useCallback(async () => {
    if (!isLoaded) return;
    setBusy(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
      } else {
        Alert.alert("Almost there", "That code didn't complete sign-up — please try again.");
      }
    } catch (err) {
      Alert.alert("Verification failed", clerkMessage(err, "Please check the code and try again."));
    } finally {
      setBusy(false);
    }
  }, [isLoaded, signUp, code, setActive]);

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        {/* Back to the create-account step (not router.back — that would leave sign-up entirely
            and lose the just-created signUp attempt) so a mistyped email can be corrected. */}
        <Pressable style={[styles.backButton, { top: insets.top + spacing.md }]} onPress={() => setPendingVerification(false)} hitSlop={12}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>
        <FadeIn style={styles.centerBlock}>
          {/* Pulsing mark makes the "waiting on you" screen feel alive instead of stalled while
              the code is in flight / being typed. */}
          <Logo size={64} pulsing />
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>We sent a 6-digit code to {email.trim()}.</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            placeholderTextColor={colors.faint}
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <Button label="Verify & continue" onPress={onVerify} disabled={busy || !code} loading={busy} style={styles.primaryButton} />
        </FadeIn>
      </View>
    );
  }

  const passwordTooWeak = password.length > 0 && strength.score === 0;

  return (
    <View style={styles.container}>
      <Pressable style={[styles.backButton, { top: insets.top + spacing.md }]} onPress={() => router.back()} hitSlop={12}>
        <Text style={styles.backButtonText}>‹ Back</Text>
      </Pressable>
      <FadeIn style={styles.centerBlock}>
        <Logo size={64} pulsing={busy} />
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Same account as the web app — start automating your academic workflow.</Text>

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
        {password.length > 0 ? (
          <View style={styles.strengthRow}>
            <View style={styles.strengthTrack}>
              <View style={[styles.strengthFill, { width: `${((strength.score + 1) / 4) * 100}%`, backgroundColor: strength.color }]} />
            </View>
            <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
          </View>
        ) : null}

        <Button
          label="Create account"
          onPress={onCreate}
          disabled={busy || !email || !password || passwordTooWeak}
          loading={busy}
          style={styles.primaryButton}
        />
        {passwordTooWeak ? <Text style={styles.strengthHint}>Add a few more characters or mix in a number/symbol.</Text> : null}

        <Pressable style={styles.signInLink} onPress={() => router.back()}>
          <Text style={styles.signInLinkText}>Already have an account? Sign in</Text>
        </Pressable>
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl, backgroundColor: colors.canvas },
  centerBlock: {},
  backButton: { position: "absolute", left: spacing.xl },
  backButtonText: { fontSize: 15, fontFamily: font.sansMedium, color: colors.cyan },
  title: { fontSize: 26, fontFamily: font.display, color: colors.ink, textAlign: "center", marginTop: 12, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: font.sans, color: colors.muted, textAlign: "center", marginBottom: 28 },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, padding: 12, marginTop: 10, fontSize: 15, fontFamily: font.sans, color: colors.ink, backgroundColor: colors.input },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 8 },
  strengthTrack: { flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: colors.raised, overflow: "hidden" },
  strengthFill: { height: "100%", borderRadius: radius.pill },
  strengthLabel: { fontSize: 12, fontFamily: font.sansSemibold, width: 44 },
  strengthHint: { fontSize: 12, fontFamily: font.sans, color: colors.faint, textAlign: "center", marginTop: 8 },
  primaryButton: { marginTop: 20 },
  signInLink: { marginTop: 20, alignItems: "center" },
  signInLinkText: { fontSize: 13, fontFamily: font.sansMedium, color: colors.cyan },
});
