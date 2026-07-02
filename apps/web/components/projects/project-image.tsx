import { Lightbox } from "@/components/ui/lightbox";

/** A "normal" (non-diagram) illustrative image for the build plan — click to view fullscreen. */
export function ProjectImage({ docId, idx, label }: { docId: string; idx: number; label: string }) {
  const src = `/api/projects/${docId}/image/${idx}`;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <Lightbox
        label={label}
        trigger={
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="h-48 w-full object-cover" loading="lazy" />
        }
      >
        <div className="flex h-full items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      </Lightbox>
      <p className="border-t border-line px-3 py-2 text-[11.5px] text-muted">{label}</p>
    </div>
  );
}
