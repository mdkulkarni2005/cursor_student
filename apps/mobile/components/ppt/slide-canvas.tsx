import { useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import type { PptRichText, PptSlide, PptTheme } from "@studentos/api-types";

/**
 * Brand-approximate 16:9 slide preview — a trimmed RN port of web's
 * `apps/web/components/ppt/slide-canvas.tsx`. Sizes scale off the measured width (the RN
 * equivalent of that component's `cqw` container-query units) so one component reads right
 * whether it's a rail thumbnail or the full-width stage.
 */
export type CanvasSlide = { kind: "title"; title: string; subtitle: string } | { kind: "content"; slide: PptSlide; imageUrl?: string | null };

const DEFAULT_THEME: PptTheme = { dark: "0A0E1A", light: "F1F5F9", accent: "22D3EE", headColor: "15191F", headFont: "System", bodyFont: "System" };
const BODY = "#333333";
const MUTED = "#667085";
const hex = (c: string) => (c.startsWith("#") ? c : `#${c}`);
const plain = (r: PptRichText | undefined): string => (!r ? "" : typeof r === "string" ? r : r.map((run) => run.text).join(""));

export function SlideCanvas({ slide, theme }: { slide: CanvasSlide; theme?: PptTheme }) {
  const t = { ...DEFAULT_THEME, ...(theme ?? {}) };
  const [w, setW] = useState(320);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const s = w / 100; // 1 "cqw" ≈ 1% of measured width

  if (slide.kind === "title") {
    return (
      <View onLayout={onLayout} style={[styles.frame, { aspectRatio: 16 / 9, backgroundColor: hex(t.dark), padding: 8 * s }]}>
        <View style={styles.center}>
          <Text style={{ color: hex(t.light), fontSize: 5.4 * s, fontWeight: "700", textAlign: "center", lineHeight: 6.2 * s }}>{slide.title}</Text>
          <Text style={{ color: hex(t.accent), fontSize: 2.7 * s, textAlign: "center", marginTop: 2.5 * s }}>{slide.subtitle}</Text>
        </View>
      </View>
    );
  }

  const { slide: sl, imageUrl } = slide;
  const layout = sl.layout ?? "bullets";

  if (layout === "section") {
    return (
      <View onLayout={onLayout} style={[styles.frame, { aspectRatio: 16 / 9, backgroundColor: hex(t.dark), padding: 8 * s }]}>
        <View style={styles.center}>
          <Text style={{ color: hex(t.light), fontSize: 4.6 * s, fontWeight: "700", textAlign: "center", lineHeight: 5.4 * s }}>{plain(sl.heading)}</Text>
          {plain(sl.bullets[0]) ? <Text style={{ color: hex(t.accent), fontSize: 2.4 * s, textAlign: "center", marginTop: 2 * s }}>{plain(sl.bullets[0])}</Text> : null}
        </View>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={{ position: "absolute", bottom: 6 * s, right: 6 * s, width: 24 * s, height: 16 * s, borderRadius: s }} resizeMode="contain" /> : null}
      </View>
    );
  }

  if (layout === "quote") {
    const q = sl.quote;
    return (
      <View onLayout={onLayout} style={[styles.frame, { aspectRatio: 16 / 9, backgroundColor: "#fff", padding: 9 * s }]}>
        <View style={[styles.row, styles.center, { flex: 1, gap: 3 * s }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: hex(t.headColor), fontSize: 3.6 * s, fontStyle: "italic", textAlign: "center", lineHeight: 4.5 * s }}>
              &ldquo;{plain(q?.text ?? sl.heading)}&rdquo;
            </Text>
            {q?.attribution ? <Text style={{ color: hex(t.accent), fontSize: 2.2 * s, textAlign: "center", marginTop: 2.5 * s }}>— {q.attribution}</Text> : null}
          </View>
          {imageUrl ? <Image source={{ uri: imageUrl }} style={{ width: 32 * s, height: 21 * s, borderRadius: s }} resizeMode="contain" /> : null}
        </View>
      </View>
    );
  }

  // Standard white content slide: accent top band + heading + accent rule + body-by-layout.
  return (
    <View onLayout={onLayout} style={[styles.frame, { aspectRatio: 16 / 9, backgroundColor: "#fff" }]}>
      <View style={{ height: 1.2 * s, backgroundColor: hex(t.accent) }} />
      <View style={{ flex: 1, padding: 4.5 * s }}>
        {plain(sl.heading) ? (
          <>
            <Text style={{ color: hex(t.headColor), fontSize: 3.6 * s, fontWeight: "700", lineHeight: 4 * s }}>{plain(sl.heading)}</Text>
            <View style={{ width: 16 * s, height: 0.45 * s, backgroundColor: hex(t.accent), marginTop: 1.4 * s, marginBottom: 2.4 * s }} />
          </>
        ) : null}
        <ContentBody slide={sl} s={s} t={t} imageUrl={imageUrl} />
      </View>
    </View>
  );
}

function ContentBody({ slide, s, t, imageUrl }: { slide: PptSlide; s: number; t: PptTheme; imageUrl?: string | null }) {
  const layout = slide.layout ?? "bullets";

  if (layout === "two-column" && slide.columns) {
    const c = slide.columns;
    return (
      <SidePanel imageUrl={imageUrl} s={s}>
        <View style={[styles.row, { flex: 1, gap: 4 * s }]}>
          {([["left", c.leftTitle, c.left], ["right", c.rightTitle, c.right]] as const).map(([key, title, items]) => (
            <View key={key} style={{ flex: 1, gap: 1.5 * s }}>
              {title ? <Text style={{ color: hex(t.accent), fontWeight: "700", fontSize: 2.2 * s }}>{title}</Text> : null}
              <Bullets items={items} s={s} size={2.4 * s} />
            </View>
          ))}
        </View>
      </SidePanel>
    );
  }

  if (layout === "table" && slide.table) {
    const tb = slide.table;
    return (
      <SidePanel imageUrl={imageUrl} s={s}>
        <View>
          <View style={styles.row}>
            {tb.headers.map((h, i) => (
              <Text key={i} style={{ flex: 1, backgroundColor: hex(t.accent), color: "#fff", fontWeight: "700", fontSize: 2.1 * s, padding: 1 * s }}>{h}</Text>
            ))}
          </View>
          {tb.rows.map((r, ri) => (
            <View key={ri} style={[styles.row, { backgroundColor: ri % 2 ? "#F8FAFC" : "#fff" }]}>
              {r.map((cell, ci) => (
                <Text key={ci} style={{ flex: 1, color: BODY, fontSize: 2.1 * s, padding: 1 * s, borderBottomWidth: 1, borderColor: "#E2E8F0" }}>{cell}</Text>
              ))}
            </View>
          ))}
        </View>
      </SidePanel>
    );
  }

  if (layout === "diagram" && slide.diagram) {
    const d = slide.diagram;
    return (
      <SidePanel imageUrl={imageUrl} s={s}>
        <View style={[styles.center, { flex: 1, gap: 1.5 * s }]}>
          <View style={[styles.row, { flexWrap: "wrap", justifyContent: "center", gap: 1.2 * s }]}>
            {d.nodes.map((n, i) => (
              <View key={i} style={[styles.row, { alignItems: "center", gap: 1.2 * s }]}>
                <Text style={{ backgroundColor: i % 2 ? "#F1F5F9" : hex(t.accent), color: i % 2 ? hex(t.headColor) : "#fff", fontWeight: "700", fontSize: 1.9 * s, paddingVertical: 1.6 * s, paddingHorizontal: 2 * s, borderRadius: s, maxWidth: 26 * s, textAlign: "center" }}>{n}</Text>
                {i < d.nodes.length - 1 ? <Text style={{ color: hex(t.accent), fontSize: 2.6 * s }}>→</Text> : null}
              </View>
            ))}
          </View>
          {d.kind === "cycle" ? <Text style={{ color: MUTED, fontStyle: "italic", fontSize: 1.8 * s }}>↻ repeats</Text> : null}
        </View>
      </SidePanel>
    );
  }

  if (layout === "stat" && slide.stats?.length) {
    return (
      <SidePanel imageUrl={imageUrl} s={s}>
        <View style={[styles.row, { flex: 1, justifyContent: "space-around", alignItems: "center" }]}>
          {slide.stats.map((st, i) => (
            <View key={i} style={{ alignItems: "center", gap: 0.8 * s }}>
              <Text style={{ color: hex(t.accent), fontWeight: "700", fontSize: 7 * s }}>{st.value}</Text>
              <Text style={{ color: BODY, fontSize: 2 * s }}>{st.label}</Text>
            </View>
          ))}
        </View>
      </SidePanel>
    );
  }

  return (
    <SidePanel imageUrl={imageUrl} s={s}>
      <Bullets items={slide.bullets} s={s} size={2.7 * s} />
    </SidePanel>
  );
}

function SidePanel({ imageUrl, s, children }: { imageUrl?: string | null; s: number; children: React.ReactNode }) {
  if (!imageUrl) return <>{children}</>;
  return (
    <View style={[styles.row, { flex: 1, gap: 3 * s }]}>
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      <Image source={{ uri: imageUrl }} style={{ width: 30 * s, height: 20 * s, borderRadius: s }} resizeMode="contain" />
    </View>
  );
}

function Bullets({ items, s, size }: { items: PptRichText[]; s: number; size: number }) {
  return (
    <View style={{ gap: 1.5 * s }}>
      {items.map((b, i) => (
        <View key={i} style={[styles.row, { gap: 1.2 * s }]}>
          <Text style={{ color: "#888", fontSize: size }}>•</Text>
          <Text style={{ flex: 1, color: BODY, fontSize: size, lineHeight: size * 1.3 }}>{plain(b)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: "100%", overflow: "hidden", borderRadius: 12 },
  center: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row" },
});
