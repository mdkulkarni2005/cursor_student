"use client";

/**
 * Opens the always-on assistant pre-scoped to this project for stuck-help (4.3),
 * seeding a first message. The global AssistantPanel listens for this window event.
 */
export function AskAssistantButton({ projectId, title }: { projectId: string; title: string }) {
  function open() {
    window.dispatchEvent(
      new CustomEvent("krackit:assistant-open", {
        detail: {
          projectId,
          label: title,
          prompt: `I'm stuck on my project "${title}". `,
        },
      }),
    );
  }
  return (
    <button
      onClick={open}
      className="rounded-xl border border-cyan/35 bg-cyan/10 px-4 py-2 text-[13px] font-semibold text-cyan transition-colors hover:bg-cyan/20"
    >
      Stuck? Ask the assistant
    </button>
  );
}
