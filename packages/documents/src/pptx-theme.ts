import PizZip from "pizzip";
import { DOMParser } from "@xmldom/xmldom";

/**
 * Extract a user-uploaded .pptx's THEME (brand colors + fonts) so the generated deck
 * matches their template's look. This is theme-level (colors/fonts/size); exact
 * per-slide layout cloning is a future step. Output is always a valid deck.
 */
export type PptxTheme = {
  ok: boolean;
  colors: { dk1?: string; lt1?: string; accent1?: string; accent2?: string };
  fonts: { major?: string; minor?: string };
  issues: string[];
};

function hex(v: string | null): string | undefined {
  if (!v) return undefined;
  return /^[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : undefined;
}

export function inspectPptxTheme(buffer: Buffer): PptxTheme {
  let zip: PizZip;
  try {
    zip = new PizZip(buffer);
  } catch {
    return { ok: false, colors: {}, fonts: {}, issues: ["This isn't a readable PowerPoint file."] };
  }
  if (!zip.file("ppt/presentation.xml")) {
    return { ok: false, colors: {}, fonts: {}, issues: ["This isn't a valid .pptx presentation."] };
  }
  const themeFile = zip.file("ppt/theme/theme1.xml");
  if (!themeFile) return { ok: true, colors: {}, fonts: {}, issues: [] };

  const dom = new DOMParser().parseFromString(themeFile.asText().replace(/^\uFEFF/, ""), "application/xml");

  const colorOf = (tag: string): string | undefined => {
    const els = dom.getElementsByTagName(`a:${tag}`);
    if (!els.length) return undefined;
    const e = els[0]!;
    const srgb = e.getElementsByTagName("a:srgbClr");
    if (srgb.length) return hex(srgb[0]!.getAttribute("val"));
    const sys = e.getElementsByTagName("a:sysClr");
    if (sys.length) return hex(sys[0]!.getAttribute("lastClr"));
    return undefined;
  };
  const fontOf = (tag: string): string | undefined => {
    const els = dom.getElementsByTagName(`a:${tag}`);
    if (!els.length) return undefined;
    const latin = els[0]!.getElementsByTagName("a:latin");
    return latin.length ? latin[0]!.getAttribute("typeface") ?? undefined : undefined;
  };

  return {
    ok: true,
    colors: { dk1: colorOf("dk1"), lt1: colorOf("lt1"), accent1: colorOf("accent1"), accent2: colorOf("accent2") },
    fonts: { major: fontOf("majorFont"), minor: fontOf("minorFont") },
    issues: [],
  };
}
