/** Icon-only K mark — square, for tight spots like the collapsed sidebar. */
export function LogoMark({ size = 150 }: { size?: number }) {
  return (
    <>
      <img
        src="/logo-mark.png"
        alt="krackit"
        width={size}
        height={size}
        className="block dark:hidden shrink-0"
        style={{ objectFit: "contain" }}
      />
      <img
        src="/logo-mark-dark.png"
        alt="krackit"
        width={size}
        height={size}
        className="hidden dark:block shrink-0"
        style={{ objectFit: "contain" }}
      />
    </>
  );
}

/** Full wordmark lockup (K mark + "krackIT" text) — wide, not square. */
export function LogoWordmark({ size = 150 }: { size?: number }) {
  const height = Math.round(size * 0.437);
  return (
    <>
      <img
        src="/LightTheme.png"
        alt="krackit"
        width={size}
        height={height}
        className="block dark:hidden shrink-0"
        style={{ objectFit: "contain" }}
      />
      <img
        src="/DarkTheme.png"
        alt="krackit"
        width={size}
        height={height}
        className="hidden dark:block shrink-0"
        style={{ objectFit: "contain" }}
      />
    </>
  );
}

export function Krackit({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-cyan">krackIT</span>
    </span>
  );
}

export function Logo({
  size = 150,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`flex items-center ${className}`}>
      <LogoWordmark size={size} />
    </span>
  );
}
