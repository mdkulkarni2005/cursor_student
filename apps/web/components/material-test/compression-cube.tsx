"use client";

/** Animated compression-test rig — top platen presses down on a cube; a passing cube stays intact (green flash), a failing one shows crack lines and a reddish tint. */
export function CompressionCube({ phase, pass }: { phase: "idle" | "pressed"; pass: boolean }) {
  const pressed = phase === "pressed";
  const cubeColor = pressed ? (pass ? "#4a9d7a" : "#8a4a42") : "#8f9296";

  return (
    <div className="relative flex flex-col items-center" style={{ width: 160, height: 200 }}>
      {/* Top platen */}
      <div
        className="h-6 w-full rounded-sm bg-[var(--color-ink)] transition-transform duration-700 ease-out"
        style={{ transform: pressed ? "translateY(28px)" : "translateY(0px)" }}
      />

      <div className="relative flex flex-1 items-center justify-center">
        <div
          className="relative rounded-[3px] transition-all duration-700 ease-out"
          style={{ width: 96, height: pressed ? 68 : 96, background: cubeColor }}
        >
          {pressed && !pass ? (
            <svg viewBox="0 0 96 96" className="absolute inset-0 h-full w-full opacity-90">
              <path d="M20 8 L40 34 L28 46 L52 70 L44 90" fill="none" stroke="#1a0a08" strokeWidth={1.6} strokeLinecap="round" />
              <path d="M76 12 L58 40 L70 52 L50 66" fill="none" stroke="#1a0a08" strokeWidth={1.6} strokeLinecap="round" />
            </svg>
          ) : null}
        </div>
      </div>

      {/* Bottom platen */}
      <div className="h-6 w-full rounded-sm bg-[var(--color-ink)]" />
    </div>
  );
}
