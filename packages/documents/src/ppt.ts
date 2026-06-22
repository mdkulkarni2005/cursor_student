import PptxGenJS from "pptxgenjs";
import { z } from "zod";
import { TemplateContractError } from "./types";
import type { PptxTheme } from "./pptx-theme";

/**
 * Structured PPT content — the only thing the AI produces for a deck. Rendered
 * deterministically into a real .pptx by pptxgenjs (per-college .pptx templates
 * can be layered on later, same content/format split as reports).
 */
export const PptSlideSchema = z.object({
  heading: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1).max(8),
  notes: z.string().optional(),
});

export const PptContentSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  slides: z.array(PptSlideSchema).min(3),
});

export type PptSlide = z.infer<typeof PptSlideSchema>;
export type PptContent = z.infer<typeof PptContentSchema>;

export async function renderPptx(
  raw: unknown,
  theme?: PptxTheme,
  /** Optional per-slide images (data URLs), aligned to `content.slides` by index. */
  images?: (string | null | undefined)[],
): Promise<{ buffer: Buffer }> {
  const parsed = PptContentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new TemplateContractError(
      "PPT content does not satisfy the contract.",
      parsed.error.flatten(),
    );
  }
  const content = parsed.data;

  // Apply the user's template theme (brand colors + fonts) where available, else Polaris defaults.
  const dark = theme?.colors.dk1 ?? "0A0E1A";
  const light = theme?.colors.lt1 ?? "F1F5F9";
  const accent = theme?.colors.accent1 ?? "22D3EE";
  const headColor = theme?.colors.dk1 ?? "15191F";
  const headFont = theme?.fonts.major ?? "Arial";
  const bodyFont = theme?.fonts.minor ?? "Arial";

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pptx.author = "StudentOS";

  // Title slide.
  const title = pptx.addSlide();
  title.background = { color: dark };
  title.addText(content.title, {
    x: 0.6, y: 2.6, w: 12.1, h: 1.4,
    fontSize: 36, bold: true, color: light, align: "center", fontFace: headFont,
  });
  title.addText(content.subtitle, {
    x: 0.6, y: 4.1, w: 12.1, h: 0.6,
    fontSize: 18, color: accent, align: "center", fontFace: headFont,
  });

  // Content slides — when a slide has an image, bullets take the left half, image the right.
  content.slides.forEach((s, i) => {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    slide.addText(s.heading, {
      x: 0.6, y: 0.5, w: 12.1, h: 0.9,
      fontSize: 26, bold: true, color: headColor, fontFace: headFont,
    });

    const image = images?.[i];
    const bulletWidth = image ? 6.9 : 11.7;
    slide.addText(
      s.bullets.map((b) => ({ text: b, options: { bullet: true } })),
      {
        x: 0.8, y: 1.6, w: bulletWidth, h: 5.2,
        fontSize: 18, color: "333333", fontFace: bodyFont,
        valign: "top", lineSpacingMultiple: 1.3, paraSpaceAfter: 8,
      },
    );
    if (image) {
      slide.addImage({ data: image, x: 8.1, y: 1.7, w: 4.6, h: 4.6, sizing: { type: "contain", w: 4.6, h: 4.6 } });
    }
    if (s.notes) slide.addNotes(s.notes);
  });

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return { buffer: out };
}
