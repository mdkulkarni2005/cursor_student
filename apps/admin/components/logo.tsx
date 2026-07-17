/**
 * krackit brand lockup — a rounded tile whose white "k" is drawn with a lightning bolt for its
 * arm and leg (the "crack" in krackit), plus the lowercase wordmark. The gradient is embedded in
 * the SVG (not Tailwind) so the mark renders identically across web/recruiter/admin and inside
 * emails or favicons later. Keep this file in sync with its copies in apps/recruiter and
 * apps/admin (same convention as install-prompt.tsx).
 */

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <defs>
        <linearGradient id="krackit-tile" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F6921E" />
          <stop offset="1" stopColor="#FDB44B" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="url(#krackit-tile)" />
      {/* k stem */}
      <rect x="12.5" y="10" width="5.5" height="28" rx="2.75" fill="#fff" />
      {/* k arm + leg drawn as a lightning bolt — the "crack" */}
      <path d="M35.5 9.5 L21.5 24.5 L27.5 24.5 L18 38.5 L32.5 23 L26.5 23 Z" fill="#fff" />
    </svg>
  );
}

export function Logo({
  size = 28,
  suffix,
  className = "",
}: {
  size?: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="flex items-baseline gap-2">
        <span className="font-display font-bold lowercase tracking-tight text-ink" style={{ fontSize: size * 0.68 }}>
          krackit
        </span>
        {suffix && (
          <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-faint">{suffix}</span>
        )}
      </span>
    </span>
  );
}
