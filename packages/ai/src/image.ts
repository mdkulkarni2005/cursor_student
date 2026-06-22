import { experimental_generateImage as generateImage } from "ai";

/**
 * Slide image generation. Images are an ENHANCEMENT — generation is best-effort and never breaks a
 * deck: on stub (no AI Gateway) or any error we return null and the slide renders text-only. Real
 * generation goes through the AI Gateway's image model (a plain `provider/model` id, resolved the
 * same way as our text models). Override the model with IMAGE_MODEL; set IMAGE_DEBUG=1 to log why a
 * generation failed (the gateway must have the chosen image model enabled).
 */
const IMAGE_MODEL = process.env.IMAGE_MODEL || "openai/dall-e-3";

export type SlideImage = { dataUrl: string };

export async function generateSlideImage(prompt: string): Promise<SlideImage | null> {
  if (process.env.AI_DRIVER === "stub") return null;
  if (!prompt.trim()) return null;

  try {
    const { image } = await generateImage({ model: IMAGE_MODEL, prompt, size: "1024x1024" });
    const mediaType = image.mediaType || "image/png";
    return { dataUrl: `data:${mediaType};base64,${image.base64}` };
  } catch (err) {
    // Image generation is optional — a failure must not fail the whole deck.
    if (process.env.IMAGE_DEBUG) {
      console.warn(`[image] generation failed via "${IMAGE_MODEL}":`, err instanceof Error ? err.message : err);
    }
    return null;
  }
}

/** A concise, on-brand prompt for a slide's visual, derived from its heading. */
export function slideImagePrompt(heading: string, topic: string): string {
  return `A clean, modern, professional illustration for an academic presentation slide titled "${heading}" about ${topic}. Flat vector style, minimal, no text, suitable as a side graphic.`;
}
