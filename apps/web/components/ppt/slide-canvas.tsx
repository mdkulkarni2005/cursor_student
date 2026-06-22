/**
 * One HTML "slide canvas" — a 16:9 box that renders a slide brand-approximately, mirroring the
 * layouts/colors of `renderPptx` (packages/documents/src/ppt.ts). The SAME component is used for the
 * thumbnail rail, the large center stage, and Present mode — sizes differ only by container width.
 *
 * Type/spacing scale with the container via container-query units (`cqw`), so one component looks
 * right at any size. Colors come from the deck's stored theme (real template hex, not app tokens).
 */
import type { PptTheme, PptSlide, RichText } from "@studentos/documents";

/** Local flatten (NOT imported from the documents barrel — that would pull pdfkit/`fs` into the
 *  client bundle). Mirrors `richToPlain`. */
function plainText(r: RichText | undefined): string {
  if (!r) return "";
  return typeof r === "string" ? r : r.map((run) => run.text).join("");
}

export type CanvasSlide =
  | { kind: "title"; title: string; subtitle: string }
  | { kind: "content"; slide: PptSlide; imageUrl?: string | null };

/** Render rich text (plain string OR formatted runs) as styled spans. */
function R({ value }: { value: RichText | undefined }) {
  if (!value) return null;
  if (typeof value === "string") return <>{value}</>;
  return (
    <>
      {value.map((run, i) => (
        <span
          key={i}
          style={{
            fontWeight: run.b ? 700 : undefined,
            fontStyle: run.i ? "italic" : undefined,
            textDecoration: run.u ? "underline" : undefined,
            color: run.color ? (run.color.startsWith("#") ? run.color : `#${run.color}`) : undefined,
            fontFamily: run.face || undefined,
            fontSize: run.size ? `${run.size}pt` : undefined,
          }}
        >
          {run.text}
        </span>
      ))}
    </>
  );
}

const DEFAULT_THEME: PptTheme = {
  dark: "0A0E1A",
  light: "F1F5F9",
  accent: "22D3EE",
  headColor: "15191F",
  headFont: "Arial",
  bodyFont: "Arial",
};

const hex = (c: string) => (c.startsWith("#") ? c : `#${c}`);
const BODY = "#333333";
const MUTED = "#667085";

function Bullets({ items, t, size = "2.7cqw" }: { items: RichText[]; t: PptTheme; size?: string }) {
  return (
    <ul className="flex flex-col gap-[1.5cqw]" style={{ color: BODY, fontFamily: t.bodyFont, fontSize: size, lineHeight: 1.3 }}>
      {items.map((b, i) => (
        <li key={i} className="flex gap-[1.2cqw]">
          <span style={{ color: hex(t.accent) }}>•</span>
          <span><R value={b} /></span>
        </li>
      ))}
    </ul>
  );
}

function ContentBody({ slide, t, imageUrl }: { slide: PptSlide; t: PptTheme; imageUrl?: string | null }) {
  switch (slide.layout) {
    case "two-column": {
      const c = slide.columns;
      if (!c) return <Bullets items={slide.bullets} t={t} />;
      return (
        <div className="flex flex-1 gap-[4cqw]">
          {([["left", c.leftTitle, c.left], ["right", c.rightTitle, c.right]] as const).map(([k, title, items]) => (
            <div key={k} className="flex flex-1 flex-col gap-[1.5cqw]">
              {title ? <div style={{ color: hex(t.accent), fontFamily: t.headFont, fontWeight: 700, fontSize: "2.2cqw" }}>{title}</div> : null}
              <Bullets items={items} t={t} size="2.4cqw" />
            </div>
          ))}
        </div>
      );
    }
    case "table": {
      const tb = slide.table;
      if (!tb) return <Bullets items={slide.bullets} t={t} />;
      return (
        <table className="w-full border-collapse" style={{ fontFamily: t.bodyFont, fontSize: "2.1cqw" }}>
          <thead>
            <tr>
              {tb.headers.map((h, i) => (
                <th key={i} className="px-[1.4cqw] py-[1cqw] text-left" style={{ background: hex(t.accent), color: "#fff", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tb.rows.map((r, ri) => (
              <tr key={ri} style={{ background: ri % 2 ? "#F8FAFC" : "#fff" }}>
                {r.map((cell, ci) => (
                  <td key={ci} className="px-[1.4cqw] py-[1cqw]" style={{ color: BODY, borderBottom: "1px solid #E2E8F0" }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "diagram": {
      const d = slide.diagram;
      if (!d) return <Bullets items={slide.bullets} t={t} />;
      if (d.kind === "hierarchy") {
        const [root, ...kids] = d.nodes;
        return (
          <div className="flex flex-1 flex-col items-center justify-center gap-[3cqw]">
            <div className="rounded-[1cqw] px-[3cqw] py-[1.6cqw] text-center" style={{ background: hex(t.accent), color: "#fff", fontWeight: 700, fontSize: "2.2cqw", fontFamily: t.bodyFont }}>{root}</div>
            <div className="flex gap-[2cqw]">
              {kids.map((n, i) => (
                <div key={i} className="rounded-[1cqw] px-[2cqw] py-[1.4cqw] text-center" style={{ background: "#F1F5F9", color: hex(t.headColor), border: `1px solid ${hex(t.accent)}`, fontSize: "2cqw", fontFamily: t.bodyFont }}>{n}</div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-[1.5cqw]">
          <div className="flex items-center justify-center gap-[1.2cqw]">
            {d.nodes.map((n, i) => (
              <div key={i} className="flex items-center gap-[1.2cqw]">
                <div className="rounded-[1cqw] px-[2cqw] py-[1.6cqw] text-center" style={{ background: i % 2 ? "#F1F5F9" : hex(t.accent), color: i % 2 ? hex(t.headColor) : "#fff", fontWeight: 700, fontSize: "1.9cqw", fontFamily: t.bodyFont, maxWidth: "20cqw" }}>{n}</div>
                {i < d.nodes.length - 1 ? <span style={{ color: hex(t.accent), fontSize: "2.6cqw" }}>→</span> : null}
              </div>
            ))}
          </div>
          {d.kind === "cycle" ? <span style={{ color: MUTED, fontStyle: "italic", fontSize: "1.8cqw" }}>↻ repeats</span> : null}
        </div>
      );
    }
    case "stat": {
      const stats = slide.stats;
      if (!stats?.length) return <Bullets items={slide.bullets} t={t} />;
      return (
        <div className="flex flex-1 items-center justify-around">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-[0.8cqw] text-center">
              <div style={{ color: hex(t.accent), fontFamily: t.headFont, fontWeight: 700, fontSize: "7cqw", lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: BODY, fontFamily: t.bodyFont, fontSize: "2cqw" }}>{s.label}</div>
            </div>
          ))}
        </div>
      );
    }
    case "image": {
      return (
        <div className="flex flex-1 gap-[3cqw]">
          <div className="flex-1"><Bullets items={slide.bullets} t={t} /></div>
          {imageUrl ? (
            <div className="flex w-[38%] items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="max-h-full max-w-full rounded-[1cqw] object-contain" />
            </div>
          ) : null}
        </div>
      );
    }
    default:
      return (
        <div className="flex flex-1 gap-[3cqw]">
          <div className="flex-1"><Bullets items={slide.bullets} t={t} /></div>
          {imageUrl ? (
            <div className="flex w-[38%] items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="max-h-full max-w-full rounded-[1cqw] object-contain" />
            </div>
          ) : null}
        </div>
      );
  }
}

export function SlideCanvas({
  slide,
  theme = DEFAULT_THEME,
  className = "",
}: {
  slide: CanvasSlide;
  theme?: PptTheme;
  className?: string;
}) {
  const t = { ...DEFAULT_THEME, ...theme };

  // Deck title slide.
  if (slide.kind === "title") {
    return (
      <Frame className={className} bg={hex(t.dark)} pad="8cqw" center>
        <div style={{ color: hex(t.light), fontFamily: t.headFont, fontSize: "5.4cqw", fontWeight: 700, lineHeight: 1.15 }}>{slide.title}</div>
        <div style={{ color: hex(t.accent), fontFamily: t.headFont, fontSize: "2.7cqw", marginTop: "2.5cqw" }}>{slide.subtitle}</div>
      </Frame>
    );
  }

  // Section divider — dark, centered.
  if (slide.slide.layout === "section") {
    return (
      <Frame className={className} bg={hex(t.dark)} pad="8cqw" center>
        <div style={{ color: hex(t.light), fontFamily: t.headFont, fontSize: "4.6cqw", fontWeight: 700, lineHeight: 1.15 }}><R value={slide.slide.heading} /></div>
        {slide.slide.bullets[0] ? <div style={{ color: hex(t.accent), fontFamily: t.headFont, fontSize: "2.4cqw", marginTop: "2cqw" }}><R value={slide.slide.bullets[0]} /></div> : null}
      </Frame>
    );
  }

  // Quote — white, centered, no heading rule.
  if (slide.slide.layout === "quote") {
    const q = slide.slide.quote;
    return (
      <Frame className={className} bg="#FFFFFF" pad="9cqw" center>
        <div style={{ color: hex(t.headColor), fontFamily: t.headFont, fontStyle: "italic", fontSize: "3.6cqw", lineHeight: 1.25, textAlign: "center" }}>“<R value={q?.text ?? slide.slide.heading} />”</div>
        {q?.attribution ? <div style={{ color: hex(t.accent), fontFamily: t.bodyFont, fontSize: "2.2cqw", marginTop: "2.5cqw" }}>— {q.attribution}</div> : null}
      </Frame>
    );
  }

  // Standard white content slide: chrome (top band + footer) + heading + accent rule + body.
  return (
    <Frame className={className} bg="#FFFFFF" pad="4.5cqw" chrome accent={hex(t.accent)}>
      {plainText(slide.slide.heading) ? (
        <>
          <div style={{ color: hex(t.headColor), fontFamily: t.headFont, fontSize: "3.6cqw", fontWeight: 700, lineHeight: 1.1 }}><R value={slide.slide.heading} /></div>
          <div style={{ width: "16cqw", height: "0.45cqw", background: hex(t.accent), margin: "1.4cqw 0 2.4cqw" }} />
        </>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <ContentBody slide={slide.slide} t={t} imageUrl={slide.imageUrl} />
      </div>
    </Frame>
  );
}

function Frame({
  children,
  className,
  bg,
  pad,
  center,
  chrome,
  accent,
}: {
  children: React.ReactNode;
  className: string;
  bg: string;
  pad: string;
  center?: boolean;
  chrome?: boolean;
  accent?: string;
}) {
  return (
    <div className={`relative aspect-video w-full overflow-hidden ${className}`} style={{ containerType: "size" }}>
      {chrome && accent ? <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1.2cqw", background: accent }} /> : null}
      <div
        className={`flex h-full w-full flex-col ${center ? "items-center justify-center text-center" : ""}`}
        style={{ backgroundColor: bg, padding: pad }}
      >
        {children}
      </div>
      {chrome ? <div style={{ position: "absolute", bottom: "2.4cqw", left: "4.5cqw", right: "4.5cqw", height: "0.12cqw", background: "#E2E8F0" }} /> : null}
    </div>
  );
}
