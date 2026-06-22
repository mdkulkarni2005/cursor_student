/**
 * Slide image generation. Images are an ENHANCEMENT — generation is best-effort and never
 * breaks a deck: on stub (no AI Gateway) or any error we return null and the slide renders
 * text-only. Real generation goes through the AI Gateway's image model.
 */
const IMAGE_MODEL = process.env.IMAGE_MODEL || "openai/dall-e-3"; // configurable via env

export type SlideImage = { dataUrl: string };

export async function generateSlideImage(prompt: string): Promise<SlideImage | null> {
  if (process.env.AI_DRIVER === "stub") return null;
  if (!prompt.trim()) return null;

  try {
    const ai = (await import("ai")) as unknown as {
      experimental_generateImage?: (args: { model: string; prompt: string; size?: string }) => Promise<{ image: { base64: string } }>;
    };
    const gen = ai.experimental_generateImage;
    if (!gen) return null;
    const { image } = await gen({ model: IMAGE_MODEL, prompt, size: "1024x1024" });
    return { dataUrl: `data:image/png;base64,${image.base64}` };
  } catch {
    // Image generation is optional — a failure must not fail the whole deck.
    return null;
  }
}

/** A concise, on-brand prompt for a slide's visual, derived from its heading. */
export function slideImagePrompt(heading: string, topic: string): string {
  return `A clean, modern, professional illustration for an academic presentation slide titled "${heading}" about ${topic}. Flat vector style, minimal, no text, suitable as a side graphic.`;
}
