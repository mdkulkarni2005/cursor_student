"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChatIcon } from "@/components/icons";
import { MessageMarkdown } from "@/components/assistant/message-markdown";

type Msg = { role: "user" | "assistant"; content: string; image?: string };

const QUICK_ACTIONS = [
  { label: "Write a report", href: "/reports" },
  { label: "Build a PPT", href: "/ppt" },
  { label: "Solve an assignment", href: "/assignments" },
  { label: "Prep my viva", href: "/viva" },
];

type Focus = { projectId: string; label: string };

export function AssistantPanel({ name }: { name?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Load the persisted thread the first time the panel opens.
  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    fetch("/api/assistant")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.messages) && d.messages.length) setMessages(d.messages as Msg[]);
      })
      .catch(() => {});
  }, [open]);

  // Stuck-help: other parts of the app (e.g. a project page) can open the assistant
  // pre-scoped to a project via a window event, optionally seeding the first message.
  useEffect(() => {
    function onOpen(e: Event) {
      const d = (e as CustomEvent<{ projectId?: string; label?: string; prompt?: string }>).detail ?? {};
      if (d.projectId && d.label) setFocus({ projectId: d.projectId, label: d.label });
      setOpen(true);
      if (d.prompt) setInput(d.prompt);
    }
    window.addEventListener("krackit:assistant-open", onOpen as EventListener);
    return () => window.removeEventListener("krackit:assistant-open", onOpen as EventListener);
  }, []);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/") || file.size > 6 * 1024 * 1024) {
      if (file) setError("Pick an image under 6 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && !image) || sending) return;
    setError(null);
    const img = image;
    const userMsg: Msg = { role: "user", content: trimmed || "(see photo)", image: img ?? undefined };
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setImage(null);
    setSending(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          focusProjectId: focus?.projectId,
          image: img ?? undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Something went wrong.");
      }
      // Stream the assistant reply in token by token.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach the assistant.");
    } finally {
      setSending(false);
    }
  }

  const firstName = name ? name.split(" ")[0] : "there";

  return (
    <>
      {/* Launcher bubble */}
      {!open ? (
        <div className="fixed bottom-20 right-4 z-50 flex items-center gap-3 lg:bottom-6 lg:right-6">
          <div className="hidden animate-floaty rounded-xl border border-line-strong bg-card px-3.5 py-2.5 text-[12.5px] text-muted shadow-[0_10px_30px_rgba(15,23,42,0.12)] sm:block">
            Ask krackit anything →
          </div>
          <button
            onClick={() => setOpen(true)}
            aria-label="Open AI mentor"
            className="flex size-14 items-center justify-center rounded-full bg-accent-gradient shadow-[0_10px_30px_rgba(254,127,45,0.45)] animate-pulse-ring"
          >
            <ChatIcon size={26} className="text-on-accent" />
          </button>
        </div>
      ) : null}

      {/* Chat panel — desktop dock (bottom-right), mobile full-screen */}
      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-base sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:max-h-[80vh] sm:w-[400px] sm:rounded-2xl sm:border sm:border-line-strong sm:bg-card sm:shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent-gradient">
                <ChatIcon size={16} className="text-on-accent" />
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-ink">krackit Assistant</p>
                <p className="text-[11px] text-faint">Grounded in your work</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-lg px-2 py-1 text-[18px] leading-none text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              ×
            </button>
          </div>

          {focus ? (
            <div className="flex items-center justify-between gap-2 border-b border-line bg-cyan/[0.06] px-4 py-2">
              <span className="truncate text-[11.5px] text-cyan">⚙ Helping with: <span className="font-semibold">{focus.label}</span></span>
              <button onClick={() => setFocus(null)} className="shrink-0 text-[11px] text-muted hover:text-ink">clear</button>
            </div>
          ) : null}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="pt-4">
                <p className="text-[14px] font-semibold text-ink">Hi {firstName} 👋</p>
                <p className="mt-1 text-[13px] text-muted">
                  I&apos;m grounded in your department and recent work. Ask me anything, or jump in:
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((a) => (
                    <Link
                      key={a.href}
                      href={a.href}
                      onClick={() => setOpen(false)}
                      className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[12px] text-soft transition-colors hover:border-cyan/50 hover:text-cyan"
                    >
                      {a.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-accent-gradient px-3.5 py-2.5 text-[13px] text-on-accent"
                      : "max-w-[85%] rounded-2xl rounded-bl-sm border border-line bg-surface px-3.5 py-2.5 text-soft"
                  }
                >
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt="attached" className="mb-1.5 max-h-40 rounded-lg" />
                  ) : null}
                  {m.role === "assistant" ? <MessageMarkdown content={m.content} /> : m.content}
                </div>
              </div>
            ))}

            {sending && messages[messages.length - 1]?.role === "user" ? (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-line bg-surface px-3.5 py-2.5 text-[13px] text-faint">
                  Thinking…
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] text-danger">
                {error}
              </div>
            ) : null}
          </div>

          {/* Composer */}
          {image ? (
            <div className="flex items-center gap-2 border-t border-line px-3 pt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="to send" className="h-12 w-12 rounded-lg object-cover" />
              <span className="text-[12px] text-muted">Photo attached</span>
              <button onClick={() => setImage(null)} className="text-[12px] text-faint hover:text-ink">remove</button>
            </div>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className={`flex items-end gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${image ? "" : "border-t border-line"}`}
          >
            <label
              className="flex size-[42px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface text-[16px] text-muted transition-colors hover:border-cyan/40 hover:text-cyan"
              aria-label="Attach photo"
              title="Attach a photo"
            >
              <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
              📎
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="Ask anything…"
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint"
            />
            <button
              type="submit"
              disabled={sending || (!input.trim() && !image)}
              className="flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-accent-gradient text-[18px] text-on-accent transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
              aria-label="Send"
            >
              ↑
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
