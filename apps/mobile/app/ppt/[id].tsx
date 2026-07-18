import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { ClarifyQuestion, PptDeckContent, PptSlide } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { useGeneratedDoc } from "@/lib/use-generated-doc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SlideCanvas, type CanvasSlide } from "@/components/ppt/slide-canvas";
import { colors, font, radius, spacing } from "@/lib/theme";

const STAGE_LABEL: Record<string, string> = { draft: "Drafting your slides", review: "Checking for missing details", format: "Designing & finalizing" };
/** Layouts basic mobile editing supports (plain heading + bullet text only — no rich toolbar, no
 *  layout switching, no table/diagram/stat editors). Everything else stays read-only preview. */
const TEXT_EDITABLE = new Set(["bullets", "image"]);

const emptyContent: PptDeckContent = { title: "", subtitle: "", slides: [] };

export default function PptDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useApiClient();
  const fetchDoc = useCallback(() => client.getPpt(id), [client, id]);
  const { doc, error, refresh } = useGeneratedDoc(fetchDoc);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [resuming, setResuming] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [content, setContent] = useState<PptDeckContent>(emptyContent);
  const [active, setActive] = useState(0);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const loadedFor = useRef<string | null>(null);
  const imagesFetchedFor = useRef<string | null>(null);

  // Load the deck into local edit state once, when it first becomes viewable — a doc that's
  // READY/NEEDS_INPUT stops polling, so this won't clobber in-progress edits on re-renders.
  useEffect(() => {
    if (!doc || doc.status === "GENERATING" || doc.status === "QUEUED") return;
    if (loadedFor.current === doc.id) return;
    const data = (doc.content ?? {}) as Partial<PptDeckContent>;
    setContent({ title: data.title ?? doc.title, subtitle: data.subtitle ?? "", slides: data.slides ?? [], theme: data.theme, templated: data.templated });
    loadedFor.current = doc.id;
    setActive(0);
    setDirty(false);
  }, [doc]);

  useEffect(() => {
    if (!doc || doc.status !== "READY" && doc.status !== "NEEDS_INPUT") return;
    if (imagesFetchedFor.current === doc.id) return;
    imagesFetchedFor.current = doc.id;
    const data = (doc.content ?? {}) as Partial<PptDeckContent>;
    (data.slides ?? []).forEach((s, i) => {
      if (!s.image) return;
      client.pptImageUrl(id, i).then((r) => setImageUrls((prev) => ({ ...prev, [i]: r.url }))).catch(() => {});
    });
  }, [doc, client, id]);

  const patchSlide = useCallback((i: number, patch: Partial<PptSlide>) => {
    setContent((c) => ({ ...c, slides: c.slides.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
    setDirty(true);
  }, []);

  const submitAnswers = useCallback(async () => {
    setResuming(true);
    try {
      await client.resumePpt(id, answers);
      refresh();
    } catch (err) {
      Alert.alert("Couldn't continue", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setResuming(false);
    }
  }, [client, id, answers, refresh]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await client.savePpt(id, content);
      setDirty(false);
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }, [client, id, content]);

  const download = useCallback(async () => {
    setDownloading(true);
    try {
      const { url } = await client.pptDownloadUrl(id);
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Alert.alert("Couldn't download", err instanceof Error ? err.message : "Try again.");
    } finally {
      setDownloading(false);
    }
  }, [client, id]);

  const canvasSlides: CanvasSlide[] = [
    { kind: "title", title: content.title, subtitle: content.subtitle },
    ...content.slides.map((s, i) => ({ kind: "content" as const, slide: s, imageUrl: s.image ? imageUrls[i] ?? null : null })),
  ];
  const current = canvasSlides[Math.min(active, canvasSlides.length - 1)];
  const contentIdx = active - 1;
  const activeSlide = active > 0 ? content.slides[contentIdx] : undefined;
  const notes = active > 0 ? activeSlide?.notes : undefined;
  const ready = doc && doc.status !== "GENERATING" && doc.status !== "QUEUED" && doc.status !== "NEEDS_INPUT" && doc.status !== "FAILED";
  const canEdit = ready && !content.templated;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: doc?.title ?? "Presentation" }} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!doc ? <ActivityIndicator color={colors.primaryDeep} style={{ marginTop: 40 }} /> : null}

      {doc?.status === "GENERATING" || doc?.status === "QUEUED" ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primaryDeep} />
          <Text style={styles.stageText}>{STAGE_LABEL[doc.stage ?? ""] ?? "Working on it…"}</Text>
        </View>
      ) : null}

      {doc?.status === "NEEDS_INPUT" && doc.questions ? (
        <View>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sparkBadge}><Text style={styles.sparkGlyph}>✦</Text></View>
            <Text style={styles.sectionHeader}>A couple of quick questions</Text>
          </View>
          <Text style={styles.hint}>We drafted what we could from your topic — answer these and we&apos;ll complete it.</Text>
          {(doc.questions as ClarifyQuestion[]).map((q) => (
            <View key={q.id} style={styles.questionBlock}>
              <Text style={styles.label}>{q.question}</Text>
              {q.options.length ? (
                <View style={styles.chipRow}>
                  {q.options.map((opt) => (
                    <Pressable key={opt} onPress={() => setAnswers((a) => ({ ...a, [q.id]: opt }))} style={[styles.chip, answers[q.id] === opt && styles.chipActive]}>
                      <Text style={[styles.chipText, answers[q.id] === opt && styles.chipTextActive]}>{opt}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <TextInput style={styles.input} value={answers[q.id] ?? ""} onChangeText={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} placeholder="Your answer" placeholderTextColor={colors.faint} />
              )}
            </View>
          ))}
          <Button label="Continue generating" onPress={submitAnswers} loading={resuming} disabled={resuming} style={{ marginTop: spacing.md }} />
        </View>
      ) : null}

      {ready && current ? (
        <View>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sparkBadge}><Text style={styles.sparkGlyph}>✦</Text></View>
            <Text style={styles.sectionHeader}>{content.slides.length + 1} slides</Text>
            {canEdit ? (
              <Pressable style={styles.editToggle} onPress={() => setEditing((e) => !e)}>
                <Text style={styles.editToggleText}>{editing ? "Done" : "✎ Edit"}</Text>
              </Pressable>
            ) : null}
          </View>
          {content.templated ? <Text style={styles.hint}>Template deck — download to edit in PowerPoint.</Text> : null}

          {editing ? (
            <EditSurface
              active={active}
              title={content.title}
              subtitle={content.subtitle}
              slide={activeSlide}
              onTitle={(v) => { setContent((c) => ({ ...c, title: v })); setDirty(true); }}
              onSubtitle={(v) => { setContent((c) => ({ ...c, subtitle: v })); setDirty(true); }}
              onPatch={(p) => patchSlide(contentIdx, p)}
            />
          ) : (
            <Card style={styles.stageCard}>
              <SlideCanvas slide={current} theme={content.theme} />
            </Card>
          )}

          <View style={styles.pagerRow}>
            <Text style={styles.pagerText}>Slide {active + 1} of {canvasSlides.length}</Text>
            <View style={styles.pagerButtons}>
              <Pressable style={styles.pagerBtn} onPress={() => setActive((a) => Math.max(0, a - 1))} disabled={active === 0}>
                <Text style={[styles.pagerBtnText, active === 0 && styles.pagerBtnTextDisabled]}>← Prev</Text>
              </Pressable>
              <Pressable style={styles.pagerBtn} onPress={() => setActive((a) => Math.min(canvasSlides.length - 1, a + 1))} disabled={active === canvasSlides.length - 1}>
                <Text style={[styles.pagerBtnText, active === canvasSlides.length - 1 && styles.pagerBtnTextDisabled]}>Next →</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={{ gap: spacing.sm }}>
            {canvasSlides.map((s, i) => (
              <Pressable key={i} onPress={() => setActive(i)} style={[styles.thumb, i === active && styles.thumbActive]}>
                <SlideCanvas slide={s} theme={content.theme} />
              </Pressable>
            ))}
          </ScrollView>

          {notes ? (
            <Card style={styles.notesCard}>
              <Text style={styles.label}>Speaker notes</Text>
              <Text style={styles.body}>{notes}</Text>
            </Card>
          ) : null}

          {editing && dirty ? <Button label={saving ? "Saving…" : "Save changes"} onPress={save} loading={saving} disabled={saving} style={{ marginTop: spacing.lg }} /> : null}
          {!editing && doc?.status === "READY" ? <Button label="Download .pptx" onPress={download} loading={downloading} disabled={downloading} style={{ marginTop: spacing.lg }} /> : null}
        </View>
      ) : null}

      {doc?.status === "FAILED" ? <Text style={styles.error}>{doc.error ?? "Generation failed — please try again."}</Text> : null}
    </ScrollView>
  );
}

function EditSurface({
  active, title, subtitle, slide, onTitle, onSubtitle, onPatch,
}: {
  active: number; title: string; subtitle: string; slide?: PptSlide;
  onTitle: (v: string) => void; onSubtitle: (v: string) => void; onPatch: (p: Partial<PptSlide>) => void;
}) {
  if (active === 0) {
    return (
      <Card style={styles.editCard}>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={onTitle} placeholder="Deck title" placeholderTextColor={colors.faint} />
        <Text style={[styles.label, { marginTop: spacing.md }]}>Subtitle</Text>
        <TextInput style={styles.input} value={subtitle} onChangeText={onSubtitle} placeholder="Deck subtitle" placeholderTextColor={colors.faint} />
      </Card>
    );
  }
  if (!slide) return null;
  const layout = slide.layout ?? "bullets";
  if (!TEXT_EDITABLE.has(layout)) {
    return (
      <Card style={styles.editCard}>
        <SlideCanvas slide={{ kind: "content", slide, imageUrl: null }} />
        <Text style={[styles.hint, { marginTop: spacing.md }]}>This layout isn&apos;t editable on mobile yet — use the web app for full editing.</Text>
      </Card>
    );
  }
  const heading = typeof slide.heading === "string" ? slide.heading : slide.heading.map((r) => r.text).join("");
  const bulletsText = slide.bullets.map((b) => (typeof b === "string" ? b : b.map((r) => r.text).join(""))).join("\n");
  return (
    <Card style={styles.editCard}>
      <Text style={styles.label}>Heading</Text>
      <TextInput style={styles.input} value={heading} onChangeText={(v) => onPatch({ heading: v })} placeholder="Slide heading" placeholderTextColor={colors.faint} />
      <Text style={[styles.label, { marginTop: spacing.md }]}>Bullets (one per line)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={bulletsText}
        onChangeText={(v) => onPatch({ bullets: v.split("\n") })}
        multiline
        placeholder={"Point one\nPoint two"}
        placeholderTextColor={colors.faint}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 60 },
  center: { alignItems: "center", marginTop: 40 },
  stageText: { fontFamily: font.sans, marginTop: spacing.md, color: colors.muted },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  sparkBadge: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: colors.indigoTint, alignItems: "center", justifyContent: "center" },
  sparkGlyph: { color: colors.primaryDeep },
  sectionHeader: { fontFamily: font.displaySemibold, fontSize: 15.5, color: colors.ink, flex: 1 },
  editToggle: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: spacing.md, backgroundColor: colors.surface },
  editToggleText: { fontFamily: font.sansSemibold, fontSize: 12.5, color: colors.primaryDeep },
  hint: { fontFamily: font.sans, fontSize: 12.5, color: colors.muted, marginTop: -spacing.sm, marginBottom: spacing.md, lineHeight: 18 },
  label: { fontFamily: font.sansSemibold, fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  body: { fontFamily: font.sans, fontSize: 13.5, color: colors.ink, lineHeight: 19, marginTop: spacing.xs },
  stageCard: { padding: 0, overflow: "hidden" },
  editCard: {},
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, padding: spacing.md, fontFamily: font.sans, fontSize: 14, color: colors.ink, backgroundColor: colors.input, marginTop: spacing.sm },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primaryDeep, borderColor: colors.primaryDeep },
  chipText: { fontFamily: font.sansMedium, fontSize: 13, color: colors.muted },
  chipTextActive: { color: colors.onAccent, fontFamily: font.sansSemibold },
  questionBlock: { marginBottom: spacing.md },
  pagerRow: { marginTop: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pagerText: { fontFamily: font.sans, fontSize: 12, color: colors.faint },
  pagerButtons: { flexDirection: "row", gap: spacing.sm },
  pagerBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 5, paddingHorizontal: spacing.sm },
  pagerBtnText: { fontFamily: font.sansMedium, fontSize: 12, color: colors.ink },
  pagerBtnTextDisabled: { color: colors.faint },
  rail: { marginTop: spacing.md },
  thumb: { width: 96, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  thumbActive: { borderColor: colors.primaryDeep, borderWidth: 2 },
  notesCard: { marginTop: spacing.md },
  error: { color: colors.danger, fontFamily: font.sans, marginBottom: spacing.md },
});
