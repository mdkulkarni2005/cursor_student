import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { Resume, ResumeDetail, ResumeEducation, ResumeExperience, ResumeProject, ResumeSkillGroup } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { useGeneratedDoc } from "@/lib/use-generated-doc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";

type EntryKind = "experience" | "projects" | "education";
const blankFor: Record<EntryKind, () => ResumeExperience | ResumeProject | ResumeEducation> = {
  experience: () => ({ organization: "New role", role: "", bullets: [] }),
  projects: () => ({ name: "New project", role: "", bullets: [], link: "" }),
  education: () => ({ institution: "New institution", degree: "" }),
};

const bulletsText = (b: string[]) => b.join("\n");
const parseBullets = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean);
const scoreTone = (score: number) => (score >= 75 ? colors.success : score >= 50 ? colors.warning : colors.danger);

export default function ResumeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useApiClient();
  const fetchDoc = useCallback(() => client.getResume(id), [client, id]);
  // Resume's own poller is simpler than the generic job poller — no NEEDS_INPUT/stage — so it's inlined below.
  const [doc, setDoc] = useState<ResumeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poll = useCallback(async () => {
    try {
      const next = await fetchDoc();
      setDoc(next);
      if (next.status === "GENERATING" || next.status === "QUEUED") timer.current = setTimeout(poll, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this resume.");
    }
  }, [fetchDoc]);
  useEffect(() => {
    poll();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [poll]);

  const [resume, setResume] = useState<Resume | null>(null);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingDensity, setTogglingDensity] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!doc || doc.status !== "READY" || !doc.resume) return;
    if (loadedFor.current === doc.id) return;
    setResume(doc.resume);
    loadedFor.current = doc.id;
    setDirty(false);
  }, [doc]);

  const setContact = useCallback((k: keyof Resume["contact"], v: string) => {
    setResume((r) => (r ? { ...r, contact: { ...r.contact, [k]: v || undefined } } : r));
    setDirty(true);
  }, []);
  const setSummary = useCallback((v: string) => {
    setResume((r) => (r ? { ...r, summary: v || undefined } : r));
    setDirty(true);
  }, []);
  const addSkillGroup = useCallback(() => {
    setResume((r) => (r ? { ...r, skills: [...r.skills, { category: "New category", items: ["Skill"] }] } : r));
    setDirty(true);
  }, []);
  const updateSkillGroup = useCallback((i: number, patch: Partial<ResumeSkillGroup>) => {
    setResume((r) => (r ? { ...r, skills: r.skills.map((s, j) => (j === i ? { ...s, ...patch } : s)) } : r));
    setDirty(true);
  }, []);
  const removeSkillGroup = useCallback((i: number) => {
    setResume((r) => (r ? { ...r, skills: r.skills.filter((_, j) => j !== i) } : r));
    setDirty(true);
  }, []);
  const addEntry = useCallback((kind: EntryKind) => {
    setResume((r) => (r ? ({ ...r, [kind]: [...r[kind], blankFor[kind]()] } as Resume) : r));
    setDirty(true);
  }, []);
  const updateEntry = useCallback((kind: EntryKind, i: number, patch: Record<string, unknown>) => {
    setResume((r) => (r ? ({ ...r, [kind]: r[kind].map((e, j) => (j === i ? { ...e, ...patch } : e)) } as Resume) : r));
    setDirty(true);
  }, []);
  const removeEntry = useCallback((kind: EntryKind, i: number) => {
    setResume((r) => (r ? ({ ...r, [kind]: r[kind].filter((_, j) => j !== i) } as Resume) : r));
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    if (!resume) return;
    setSaving(true);
    try {
      await client.updateResume(id, resume);
      setDirty(false);
      poll();
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }, [client, id, resume, poll]);

  const toggleDensity = useCallback(async () => {
    const next = doc?.meta?.density === "tight" ? "normal" : "tight";
    setTogglingDensity(true);
    try {
      await client.setResumeDensity(id, next);
      poll();
    } catch (err) {
      Alert.alert("Couldn't update", err instanceof Error ? err.message : "Try again.");
    } finally {
      setTogglingDensity(false);
    }
  }, [client, id, doc?.meta?.density, poll]);

  const download = useCallback(async () => {
    setDownloading(true);
    try {
      const { url } = await client.resumeDownloadUrl(id);
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Alert.alert("Couldn't download", err instanceof Error ? err.message : "Try again.");
    } finally {
      setDownloading(false);
    }
  }, [client, id]);

  const ats = doc?.meta?.ats;
  const score = ats?.score ?? 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: doc?.title ?? "Resume" }} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!doc ? <ActivityIndicator color={colors.cyan} style={{ marginTop: 40 }} /> : null}

      {doc?.status === "GENERATING" || doc?.status === "QUEUED" ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.cyan} />
          <Text style={styles.stageText}>Building your resume…</Text>
        </View>
      ) : null}

      {doc?.status === "READY" && resume ? (
        <View>
          {ats ? (
            <Card style={styles.scoreCard}>
              <View style={styles.scoreRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scoreLabel}>Resume Score</Text>
                  <Text style={styles.scoreHint}>Keyword match {ats.keywordCoverage}%{doc.meta?.targetRole ? ` · vs ${doc.meta.targetRole}` : ""}</Text>
                </View>
                <Text style={[styles.scoreValue, { color: scoreTone(score) }]}>{score}<Text style={styles.scoreOutOf}> /100</Text></Text>
              </View>
              {ats.missing.length > 0 ? (
                <Text style={styles.scoreMissing}>⚡ Missing {ats.missing.length} high-impact keyword{ats.missing.length === 1 ? "" : "s"}: {ats.missing.slice(0, 4).join(", ")}</Text>
              ) : null}
            </Card>
          ) : null}

          <View style={styles.toolbarRow}>
            <Pressable style={styles.toolbarBtn} onPress={toggleDensity} disabled={togglingDensity}>
              <Text style={styles.toolbarBtnText}>{togglingDensity ? "Working…" : doc.meta?.density === "tight" ? "Standard spacing" : "Fit to one page"}</Text>
            </Pressable>
            <Pressable style={styles.toolbarBtn} onPress={() => setEditing((e) => !e)}>
              <Text style={styles.toolbarBtnText}>{editing ? "Done" : "✎ Edit"}</Text>
            </Pressable>
          </View>

          {editing ? (
            <EditForm
              resume={resume}
              onContact={setContact}
              onSummary={setSummary}
              onAddSkillGroup={addSkillGroup}
              onUpdateSkillGroup={updateSkillGroup}
              onRemoveSkillGroup={removeSkillGroup}
              onAddEntry={addEntry}
              onUpdateEntry={updateEntry}
              onRemoveEntry={removeEntry}
            />
          ) : (
            <ResumePreview resume={resume} />
          )}

          {editing && dirty ? <Button label={saving ? "Saving…" : "Save changes"} onPress={save} loading={saving} disabled={saving} style={{ marginTop: spacing.lg }} /> : null}
          {!editing ? <Button label="Download .docx" onPress={download} loading={downloading} disabled={downloading} style={{ marginTop: spacing.lg }} /> : null}
        </View>
      ) : null}

      {doc?.status === "FAILED" ? <Text style={styles.error}>{doc.error ?? "Generation failed — please try again."}</Text> : null}
    </ScrollView>
  );
}

// ---------- read view ----------
function ResumePreview({ resume: r }: { resume: Resume }) {
  const contactBits = [r.contact.phone, r.contact.email, r.contact.location, r.contact.linkedin, r.contact.github, r.contact.portfolio].filter(Boolean);
  return (
    <Card style={styles.previewCard}>
      <Text style={styles.previewName}>{r.contact.name?.toUpperCase()}</Text>
      {contactBits.length ? <Text style={styles.previewContact}>{contactBits.join("  |  ")}</Text> : null}

      {r.summary ? (
        <PreviewSection title="Professional Summary"><Text style={styles.previewBody}>{r.summary}</Text></PreviewSection>
      ) : null}

      {r.skills.length ? (
        <PreviewSection title="Skills">
          {r.skills.map((g, i) => (
            <Text key={i} style={styles.previewBody}><Text style={styles.previewBold}>{g.category}: </Text>{g.items.join(", ")}</Text>
          ))}
        </PreviewSection>
      ) : null}

      {r.experience.length ? (
        <PreviewSection title="Professional Experience">
          {r.experience.map((e, i) => <PreviewEntry key={i} left={e.organization} right={dateStr(e.dates)} sub={e.role} subRight={e.location} bullets={e.bullets} />)}
        </PreviewSection>
      ) : null}

      {r.projects.length ? (
        <PreviewSection title="Projects & Outside Experience">
          {r.projects.map((p, i) => <PreviewEntry key={i} left={p.name} right={dateStr(p.dates)} sub={p.role} subRight={p.location} bullets={p.bullets} link={p.link} />)}
        </PreviewSection>
      ) : null}

      {r.education.length ? (
        <PreviewSection title="Education">
          {r.education.map((ed, i) => <PreviewEntry key={i} left={ed.institution} right={dateStr(ed.dates)} sub={ed.degree} subRight={ed.location} />)}
        </PreviewSection>
      ) : null}
    </Card>
  );
}
function dateStr(d?: { start?: string; end?: string }) { return [d?.start, d?.end].filter(Boolean).join(" – "); }
function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.previewSection}>
      <Text style={styles.previewSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function PreviewEntry({ left, right, sub, subRight, bullets, link }: { left: string; right?: string; sub?: string; subRight?: string; bullets?: string[]; link?: string }) {
  return (
    <View style={styles.previewEntry}>
      <View style={styles.previewEntryRow}>
        <Text style={styles.previewEntryLeft} numberOfLines={1}>{left}</Text>
        {right ? <Text style={styles.previewEntryRight}>{right}</Text> : null}
      </View>
      {sub || subRight ? (
        <View style={styles.previewEntryRow}>
          <Text style={styles.previewEntrySub}>{sub}</Text>
          {subRight ? <Text style={styles.previewEntrySubRight}>{subRight}</Text> : null}
        </View>
      ) : null}
      {bullets?.map((b, i) => <Text key={i} style={styles.previewBullet}>•  {b}</Text>)}
      {link ? <Text style={styles.previewLink}>{link}</Text> : null}
    </View>
  );
}

// ---------- edit view ----------
function EditForm({
  resume: r, onContact, onSummary, onAddSkillGroup, onUpdateSkillGroup, onRemoveSkillGroup, onAddEntry, onUpdateEntry, onRemoveEntry,
}: {
  resume: Resume;
  onContact: (k: keyof Resume["contact"], v: string) => void;
  onSummary: (v: string) => void;
  onAddSkillGroup: () => void;
  onUpdateSkillGroup: (i: number, patch: Partial<ResumeSkillGroup>) => void;
  onRemoveSkillGroup: (i: number) => void;
  onAddEntry: (kind: EntryKind) => void;
  onUpdateEntry: (kind: EntryKind, i: number, patch: Record<string, unknown>) => void;
  onRemoveEntry: (kind: EntryKind, i: number) => void;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <Card style={styles.editCard}>
        <Text style={styles.editSectionTitle}>Contact</Text>
        <View style={styles.contactRow}>
          <TextInput style={[styles.input, styles.contactHalf]} value={r.contact.name} onChangeText={(v) => onContact("name", v)} placeholder="Full name" placeholderTextColor={colors.faint} />
          <TextInput style={[styles.input, styles.contactHalf]} value={r.contact.email ?? ""} onChangeText={(v) => onContact("email", v)} placeholder="Email" autoCapitalize="none" placeholderTextColor={colors.faint} />
        </View>
        <View style={[styles.contactRow, { marginTop: spacing.sm }]}>
          <TextInput style={[styles.input, styles.contactHalf]} value={r.contact.phone ?? ""} onChangeText={(v) => onContact("phone", v)} placeholder="Phone" placeholderTextColor={colors.faint} />
          <TextInput style={[styles.input, styles.contactHalf]} value={r.contact.location ?? ""} onChangeText={(v) => onContact("location", v)} placeholder="City, State" placeholderTextColor={colors.faint} />
        </View>
        <View style={[styles.contactRow, { marginTop: spacing.sm }]}>
          <TextInput style={[styles.input, styles.contactHalf]} value={r.contact.linkedin ?? ""} onChangeText={(v) => onContact("linkedin", v)} placeholder="LinkedIn" autoCapitalize="none" placeholderTextColor={colors.faint} />
          <TextInput style={[styles.input, styles.contactHalf]} value={r.contact.github ?? ""} onChangeText={(v) => onContact("github", v)} placeholder="GitHub" autoCapitalize="none" placeholderTextColor={colors.faint} />
        </View>
      </Card>

      <Card style={styles.editCard}>
        <Text style={styles.editSectionTitle}>Professional Summary</Text>
        <TextInput style={[styles.input, styles.textArea]} value={r.summary ?? ""} onChangeText={onSummary} multiline placeholder="A short pitch — role, focus, strongest wins." placeholderTextColor={colors.faint} />
      </Card>

      <Card style={styles.editCard}>
        <View style={styles.editSectionHeadRow}>
          <Text style={styles.editSectionTitle}>Skills</Text>
          <Pressable onPress={onAddSkillGroup}><Text style={styles.addLink}>+ Add group</Text></Pressable>
        </View>
        {r.skills.map((g, i) => (
          <View key={i} style={styles.entryBlock}>
            <View style={styles.contactRow}>
              <TextInput style={[styles.input, styles.contactHalf]} value={g.category} onChangeText={(v) => onUpdateSkillGroup(i, { category: v })} placeholder="Category, e.g. Languages" placeholderTextColor={colors.faint} />
              <Pressable style={styles.removeBtn} onPress={() => onRemoveSkillGroup(i)}><Text style={styles.removeBtnText}>Remove</Text></Pressable>
            </View>
            <TextInput style={[styles.input, { marginTop: spacing.sm }]} value={g.items.join(", ")} onChangeText={(v) => onUpdateSkillGroup(i, { items: v.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Comma-separated skills" placeholderTextColor={colors.faint} />
          </View>
        ))}
      </Card>

      <EntryListEditor title="Professional Experience" kind="experience" entries={r.experience} onAdd={onAddEntry} onUpdate={onUpdateEntry} onRemove={onRemoveEntry} primaryField="organization" primaryLabel="Organization" />
      <EntryListEditor title="Projects" kind="projects" entries={r.projects} onAdd={onAddEntry} onUpdate={onUpdateEntry} onRemove={onRemoveEntry} primaryField="name" primaryLabel="Project name" showLink />
      <EntryListEditor title="Education" kind="education" entries={r.education} onAdd={onAddEntry} onUpdate={onUpdateEntry} onRemove={onRemoveEntry} primaryField="institution" primaryLabel="Institution" showBullets={false} />
    </View>
  );
}

function EntryListEditor<K extends EntryKind>({
  title, kind, entries, onAdd, onUpdate, onRemove, primaryField, primaryLabel, showLink, showBullets = true,
}: {
  title: string; kind: K; entries: (ResumeExperience | ResumeProject | ResumeEducation)[];
  onAdd: (kind: EntryKind) => void; onUpdate: (kind: EntryKind, i: number, patch: Record<string, unknown>) => void; onRemove: (kind: EntryKind, i: number) => void;
  primaryField: string; primaryLabel: string; showLink?: boolean; showBullets?: boolean;
}) {
  return (
    <Card style={styles.editCard}>
      <View style={styles.editSectionHeadRow}>
        <Text style={styles.editSectionTitle}>{title}</Text>
        <Pressable onPress={() => onAdd(kind)}><Text style={styles.addLink}>+ Add</Text></Pressable>
      </View>
      {entries.map((e, i) => {
        const rec = e as Record<string, unknown>;
        return (
          <View key={i} style={styles.entryBlock}>
            <View style={styles.contactRow}>
              <TextInput style={[styles.input, styles.contactHalf]} value={String(rec[primaryField] ?? "")} onChangeText={(v) => onUpdate(kind, i, { [primaryField]: v })} placeholder={primaryLabel} placeholderTextColor={colors.faint} />
              <Pressable style={styles.removeBtn} onPress={() => onRemove(kind, i)}><Text style={styles.removeBtnText}>Remove</Text></Pressable>
            </View>
            <View style={[styles.contactRow, { marginTop: spacing.sm }]}>
              <TextInput style={[styles.input, styles.contactHalf]} value={String(rec.role ?? rec.degree ?? "")} onChangeText={(v) => onUpdate(kind, i, kind === "education" ? { degree: v } : { role: v })} placeholder={kind === "education" ? "Degree" : "Role"} placeholderTextColor={colors.faint} />
              <TextInput style={[styles.input, styles.contactHalf]} value={String(rec.location ?? "")} onChangeText={(v) => onUpdate(kind, i, { location: v })} placeholder="Location" placeholderTextColor={colors.faint} />
            </View>
            <View style={[styles.contactRow, { marginTop: spacing.sm }]}>
              <TextInput style={[styles.input, styles.contactHalf]} value={String((rec.dates as { start?: string } | undefined)?.start ?? "")} onChangeText={(v) => onUpdate(kind, i, { dates: { ...(rec.dates as object), start: v } })} placeholder="Start" placeholderTextColor={colors.faint} />
              <TextInput style={[styles.input, styles.contactHalf]} value={String((rec.dates as { end?: string } | undefined)?.end ?? "")} onChangeText={(v) => onUpdate(kind, i, { dates: { ...(rec.dates as object), end: v } })} placeholder="End" placeholderTextColor={colors.faint} />
            </View>
            {showLink ? (
              <TextInput style={[styles.input, { marginTop: spacing.sm }]} value={String(rec.link ?? "")} onChangeText={(v) => onUpdate(kind, i, { link: v })} placeholder="Link (optional)" autoCapitalize="none" placeholderTextColor={colors.faint} />
            ) : null}
            {showBullets ? (
              <TextInput
                style={[styles.input, styles.textArea, { marginTop: spacing.sm }]}
                value={bulletsText((rec.bullets as string[] | undefined) ?? [])}
                onChangeText={(v) => onUpdate(kind, i, { bullets: parseBullets(v) })}
                multiline
                placeholder={"One bullet per line"}
                placeholderTextColor={colors.faint}
              />
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 60 },
  center: { alignItems: "center", marginTop: 40 },
  stageText: { fontFamily: font.sans, marginTop: spacing.md, color: colors.muted },
  error: { color: colors.danger, fontFamily: font.sans, marginBottom: spacing.md },

  scoreCard: { marginBottom: spacing.md },
  scoreRow: { flexDirection: "row", alignItems: "flex-start" },
  scoreLabel: { fontFamily: font.displaySemibold, fontSize: 15, color: colors.ink },
  scoreHint: { fontFamily: font.sans, fontSize: 12, color: colors.muted, marginTop: 2 },
  scoreValue: { fontFamily: font.display, fontSize: 30 },
  scoreOutOf: { fontFamily: font.sans, fontSize: 13, color: colors.muted },
  scoreMissing: { fontFamily: font.sans, fontSize: 11.5, color: colors.warning, backgroundColor: "rgba(217, 119, 6, 0.1)", borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm },

  toolbarRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  toolbarBtn: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: spacing.md, backgroundColor: colors.surface },
  toolbarBtnText: { fontFamily: font.sansSemibold, fontSize: 12.5, color: colors.cyan },

  previewCard: {},
  previewName: { fontFamily: font.display, fontSize: 18, color: colors.ink, textAlign: "center", letterSpacing: 0.5 },
  previewContact: { fontFamily: font.sans, fontSize: 11, color: colors.muted, textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.md },
  previewSection: { marginTop: spacing.md },
  previewSectionTitle: { fontFamily: font.displaySemibold, fontSize: 11.5, color: colors.ink, textTransform: "uppercase", letterSpacing: 0.5, borderBottomWidth: 1, borderColor: colors.line, paddingBottom: spacing.xs, marginBottom: spacing.sm },
  previewBody: { fontFamily: font.sans, fontSize: 12.5, color: colors.muted, lineHeight: 18, marginBottom: 2 },
  previewBold: { fontFamily: font.sansSemibold, color: colors.ink },
  previewEntry: { marginBottom: spacing.sm },
  previewEntryRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  previewEntryLeft: { fontFamily: font.sansSemibold, fontSize: 13, color: colors.ink, flexShrink: 1 },
  previewEntryRight: { fontFamily: font.sans, fontSize: 11, color: colors.faint },
  previewEntrySub: { fontFamily: font.sans, fontSize: 12, color: colors.muted, fontStyle: "italic" },
  previewEntrySubRight: { fontFamily: font.sans, fontSize: 11, color: colors.faint, fontStyle: "italic" },
  previewBullet: { fontFamily: font.sans, fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  previewLink: { fontFamily: font.sans, fontSize: 11, color: colors.cyan, fontStyle: "italic", marginTop: 2 },

  editCard: {},
  editSectionTitle: { fontFamily: font.sansSemibold, fontSize: 13, color: colors.ink, marginBottom: spacing.sm },
  editSectionHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  addLink: { fontFamily: font.sansSemibold, fontSize: 12.5, color: colors.cyan },
  removeBtn: { justifyContent: "center", paddingHorizontal: spacing.sm },
  removeBtnText: { fontFamily: font.sansMedium, fontSize: 11.5, color: colors.danger },
  entryBlock: { marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderColor: colors.line },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, padding: spacing.md, fontFamily: font.sans, fontSize: 14, color: colors.ink, backgroundColor: colors.input },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  contactRow: { flexDirection: "row", gap: spacing.sm },
  contactHalf: { flex: 1 },
});
