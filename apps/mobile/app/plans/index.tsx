import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import RazorpayCheckout from "react-native-razorpay";
import { useApiClient } from "@/lib/api";
import { ScrollScreen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";
import { StarIcon } from "@/components/icons";
import type { PlanTierSummary } from "@studentos/api-types";

const USAGE_LABEL: Record<string, string> = {
  ASSIGNMENT: "Assignments",
  REPORT: "Reports",
  PPT: "PPTs",
  LAB_REPORT: "Lab reports",
  BRANCH_SOLVER: "Branch-solver tools",
  INTERVIEW: "Mock interview sessions",
  DSA: "DSA problem submissions",
};

function featuresFor(tier: PlanTierSummary): string[] {
  const usage = Object.entries(tier.limits.usage ?? {})
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${v === null || v === undefined ? "Unlimited" : v} ${USAGE_LABEL[k] ?? k} / month`);
  const features = Object.entries(tier.limits.features ?? {})
    .filter(([, on]) => on)
    .map(([k]) => k);
  return [...usage, ...features];
}

function money(cents: number, currency: string): string {
  const symbol = currency === "INR" ? "₹" : currency + " ";
  return `${symbol}${(cents / 100).toFixed(0)}`;
}

export default function Plans() {
  const client = useApiClient();
  const { user } = useUser();
  const [tiers, setTiers] = useState<PlanTierSummary[]>([]);
  const [currentTierId, setCurrentTierId] = useState<string | null>(null);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyTierId, setBusyTierId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await client.getPlans();
      setTiers(res.tiers);
      setCurrentTierId(res.currentTierId);
      setPaymentsEnabled(res.paymentsEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load plans.");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  const purchase = useCallback(
    async (tier: PlanTierSummary) => {
      setBusyTierId(tier.id);
      try {
        const order = await client.createCheckoutOrder({ planTierId: tier.id });
        const base = {
          name: "StudentOS",
          description: order.tierName,
          currency: order.currency,
          key: order.keyId,
          prefill: { email: user?.primaryEmailAddress?.emailAddress ?? "", name: user?.fullName ?? "" },
          theme: { color: "#f6921e" },
        };
        const options =
          order.mode === "order"
            ? { ...base, amount: String(order.amountCents), order_id: order.orderId }
            : { ...base, subscription_id: order.subscriptionId };

        const result = await RazorpayCheckout.open(options);

        await client.verifyCheckout(
          order.mode === "order"
            ? {
                mode: "order",
                razorpay_order_id: result.razorpay_order_id!,
                razorpay_payment_id: result.razorpay_payment_id,
                razorpay_signature: result.razorpay_signature,
                planTierId: order.planTierId,
              }
            : {
                mode: "subscription",
                razorpay_subscription_id: result.razorpay_subscription_id!,
                razorpay_payment_id: result.razorpay_payment_id,
                razorpay_signature: result.razorpay_signature,
                planTierId: order.planTierId,
              },
        );

        Alert.alert("Payment successful", `You're now on ${order.tierName}.`);
        load();
      } catch (err: unknown) {
        // RazorpayCheckout rejects with { code, description } on cancel/failure — not an Error instance.
        const description = (err as { description?: string })?.description;
        Alert.alert("Payment not completed", description || (err instanceof Error ? err.message : "Please try again."));
      } finally {
        setBusyTierId(null);
      }
    },
    [client, user, load],
  );

  return (
    <ScrollScreen contentContainerStyle={{ paddingBottom: 60 }}>
      <Stack.Screen options={{ title: "Plans & Billing" }} />
      <Text style={styles.title}>Plans & Billing</Text>
      <Text style={styles.subtitle}>Choose the plan that fits your study needs.</Text>

      {loading ? <ActivityIndicator color={colors.cyan} style={{ marginTop: spacing.xl }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !paymentsEnabled ? (
        <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.indigoTint }}>
          <Text style={styles.noticeText}>Checkout isn't live yet — you can browse plans below, but purchasing is temporarily disabled.</Text>
        </Card>
      ) : null}

      {tiers.map((tier) => {
        const isCurrent = tier.id === currentTierId;
        const feats = featuresFor(tier);
        return (
          <Card key={tier.id} style={[styles.tierCard, isCurrent && styles.tierCardCurrent]}>
            <View style={styles.tierHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tierName}>{tier.name}</Text>
                {tier.description ? <Text style={styles.tierDescription}>{tier.description}</Text> : null}
              </View>
              {isCurrent ? (
                <View style={styles.currentBadge}>
                  <StarIcon size={12} color={colors.cyan} />
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.price}>
              {tier.isFree || tier.priceCents <= 0 ? "Free" : money(tier.priceCents, tier.currency)}
              {!tier.isFree && tier.priceCents > 0 ? <Text style={styles.pricePeriod}> / {tier.billingPeriod}</Text> : null}
            </Text>

            {feats.length > 0 ? (
              <View style={{ marginTop: spacing.sm }}>
                {feats.map((f) => (
                  <Text key={f} style={styles.featureLine}>
                    · {f}
                  </Text>
                ))}
              </View>
            ) : null}

            {!tier.isFree ? (
              <View style={styles.creditsBlock}>
                <View style={styles.creditsBadge}>
                  <Text style={styles.creditsBadgeText}>
                    + {tier.credits === null ? "Unlimited" : tier.credits} credits/mo
                  </Text>
                </View>
                <Text style={styles.creditsNote}>
                  Every generation and every edit spends credits — priced to break even: no profit, no loss.
                </Text>
              </View>
            ) : null}

            {!isCurrent && !tier.isFree && tier.priceCents > 0 ? (
              <Button
                label="Upgrade"
                onPress={() => purchase(tier)}
                loading={busyTierId === tier.id}
                disabled={!paymentsEnabled || busyTierId !== null}
                style={{ marginTop: spacing.lg }}
              />
            ) : null}
          </Card>
        );
      })}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.display, fontSize: 22, color: colors.ink },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 18 },
  error: { color: colors.danger, fontFamily: font.sans, marginBottom: spacing.md },
  noticeText: { fontFamily: font.sans, fontSize: 13, color: colors.ink, lineHeight: 18 },
  tierCard: { marginBottom: spacing.md },
  tierCardCurrent: { borderColor: colors.cyan },
  tierHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  tierName: { fontFamily: font.displaySemibold, fontSize: 16, color: colors.ink },
  tierDescription: { fontFamily: font.sans, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  currentBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.cyanTint, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  currentBadgeText: { fontFamily: font.sansSemibold, fontSize: 11, color: colors.cyan },
  price: { fontFamily: font.display, fontSize: 20, color: colors.ink, marginTop: spacing.md },
  pricePeriod: { fontFamily: font.sans, fontSize: 13, color: colors.muted },
  featureLine: { fontFamily: font.sans, fontSize: 12.5, color: colors.soft, lineHeight: 19 },
  creditsBlock: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  creditsBadge: { alignSelf: "flex-start", backgroundColor: colors.tealTint, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  creditsBadgeText: { fontFamily: font.sansSemibold, fontSize: 12.5, color: colors.teal },
  creditsNote: { fontFamily: font.sans, fontSize: 11.5, fontStyle: "italic", color: colors.muted, marginTop: 6, lineHeight: 16 },
});
