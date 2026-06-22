"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Extension } from "@codemirror/state";
import { Button, Spinner } from "@/components/ui/button";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

type Lang = "python" | "javascript" | "typescript" | "java" | "cpp";
const LANGS: { id: Lang; label: string }[] = [
  { id: "python", label: "Python" }, { id: "javascript", label: "JavaScript" }, { id: "typescript", label: "TypeScript" }, { id: "java", label: "Java" }, { id: "cpp", label: "C++" },
];
const EXT: Record<Lang, () => Extension> = {
  python: () => python(), javascript: () => javascript(), typescript: () => javascript({ typescript: true }), java: () => java(), cpp: () => cpp(),
};

type VapiMsg = { type?: string; role?: string; transcript?: string; transcriptType?: string };
export type InterviewView = {
  phase: "active" | "complete";
  question: string;
  kind: "question" | "coding" | "answer";
  runnable: boolean;
  answered: number;
  total: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluation: any | null;
};

const MAX_CALL_MS = 20 * 60_000; // hard cap on the whole session (credit guard)

export function InterviewLiveSession({
  docId,
  initialView,
  onExit,
}: {
  docId: string;
  initialView: InterviewView;
  onExit: () => void;
}) {
  const router = useRouter();
  const [view, setView] = useState<InterviewView>(initialView);
  const [callStatus, setCallStatus] = useState<"idle" | "connecting" | "live" | "ended" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState(""); // candidate's spoken answer (current question)
  const [submitting, setSubmitting] = useState(false);

  // media gate — camera AND mic are mandatory before joining
  const [permission, setPermission] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [camOn, setCamOn] = useState(true);
  const [muted, setMuted] = useState(false);

  // active-speaker animation
  const [speaking, setSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);

  // coding answer state
  const [lang, setLang] = useState<Lang>("python");
  const [code, setCode] = useState("");
  const [runOutput, setRunOutput] = useState("");
  const [running, setRunning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

  function stopEverything() {
    if (timerRef.current) clearTimeout(timerRef.current);
    try { vapiRef.current?.stop?.(); } catch { /* ignore */ }
    vapiRef.current = null;
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
  }
  useEffect(() => stopEverything, []);

  // Keep whichever <video> is mounted (lobby or room) wired to the live stream.
  useEffect(() => {
    if (videoRef.current && camStreamRef.current) videoRef.current.srcObject = camStreamRef.current;
  }, [callStatus, permission, view.kind, camOn]);

  function speak(text: string) {
    try { vapiRef.current?.say?.(text); } catch { /* ignore */ }
  }

  /** Pre-flight: camera + mic are required. Mic track is released so VAPI can own it. */
  async function requestMedia() {
    setError(null);
    setPermission("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getAudioTracks().forEach((t) => t.stop()); // VAPI re-acquires the mic itself
      camStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamOn(true);
      setPermission("granted");
    } catch {
      setPermission("denied");
    }
  }
  // Ask as soon as the lobby mounts (Google-Meet style preview).
  useEffect(() => { if (permission === "idle") void requestMedia(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function startSession() {
    setError(null);
    if (permission !== "granted") { void requestMedia(); return; }
    if (!publicKey) {
      setError("Live voice isn't configured on this deployment. Please contact support.");
      setCallStatus("error");
      return;
    }
    setCallStatus("connecting");
    try {
      const Vapi = (await import("@vapi-ai/web")).default;
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;
      vapi.on("call-start", () => {
        setCallStatus("live");
        timerRef.current = setTimeout(() => endSession(), MAX_CALL_MS);
      });
      vapi.on("call-end", () => { setSpeaking(false); setCallStatus("ended"); });
      vapi.on("speech-start", () => setSpeaking(true));
      vapi.on("speech-end", () => { setSpeaking(false); setVolume(0); });
      vapi.on("volume-level", (v: number) => setVolume(typeof v === "number" ? v : 0));
      vapi.on("error", (e: unknown) => { setError("Voice connection dropped. Try rejoining."); setCallStatus("error"); console.warn("[vapi]", e); });
      vapi.on("message", (m: VapiMsg) => {
        if (m.type === "transcript" && m.role === "user" && m.transcriptType === "final" && m.transcript) {
          setTranscript((p) => (p ? `${p} ${m.transcript}` : m.transcript!));
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await vapi.start({
        firstMessage: view.question,
        model: { provider: "openai", model: "gpt-4o-mini", messages: [{ role: "system", content: "You are the voice of an interview app. Speak ONLY the messages you are given, then stay completely silent and listen. Never ask follow-ups or respond on your own." }] },
      } as any);
    } catch (e) {
      setError("Couldn't connect the voice call. Try rejoining.");
      setCallStatus("error");
      console.warn("[vapi] start failed", e);
    }
  }

  function toggleMute() {
    const next = !muted;
    try { vapiRef.current?.setMuted?.(next); } catch { /* ignore */ }
    setMuted(next);
  }
  function toggleCam() {
    const track = camStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }

  async function runCode() {
    setRunning(true);
    setRunOutput("");
    try {
      const res = await fetch("/api/interview/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docId, language: lang, code }) });
      const d = await res.json();
      if (d.unavailable) setRunOutput(d.message);
      else setRunOutput([d.stdout, d.stderr ? `stderr: ${d.stderr}` : ""].filter(Boolean).join("\n") || "(no output)");
    } catch {
      setRunOutput("Couldn't run right now.");
    } finally {
      setRunning(false);
    }
  }

  async function submit() {
    const isCoding = view.kind === "coding";
    const answer = isCoding ? `${code}${transcript ? `\n\n/* Spoken: ${transcript} */` : ""}` : transcript;
    if (!answer.trim()) { setError(isCoding ? "Write some code first." : "Say or type your answer first."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/interview/answer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, answer, language: isCoding ? lang : undefined, runOutput: isCoding ? runOutput : undefined }),
      });
      const d = await res.json();
      if (d.error) { setError(d.error); return; }
      setTranscript(""); setCode(""); setRunOutput("");
      if (d.phase === "complete") {
        setView((v) => ({ ...v, phase: "complete", evaluation: d.evaluation }));
        speak("That's the end of the interview. I've prepared your evaluation.");
        setTimeout(() => endSession(), 1500);
        router.refresh();
      } else {
        setView({ phase: "active", question: d.nextQuestion, kind: d.kind, runnable: d.runnable, answered: d.answered, total: d.total, evaluation: null });
        speak(d.nextQuestion);
      }
    } catch {
      setError("Couldn't submit — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function endSession() {
    stopEverything();
    setSpeaking(false);
    setCallStatus("ended");
    router.refresh();
  }

  // ---------------------------------------------------------------- complete
  if (view.phase === "complete") {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-success/15 text-2xl">🎉</div>
        <p className="text-[15px] font-semibold text-ink">Interview complete</p>
        <p className="mt-1 text-[13px] text-muted">Your evaluation is ready below.</p>
        <Button type="button" onClick={() => { endSession(); onExit(); }} className="mt-4 rounded-xl bg-accent-gradient px-5 py-2.5 text-[13px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(34,211,238,0.3)]">See evaluation ↓</Button>
      </div>
    );
  }

  // ---------------------------------------------------------------- lobby
  const inRoom = callStatus === "connecting" || callStatus === "live";
  if (!inRoom) {
    return (
      <Lobby
        videoRef={videoRef}
        permission={permission}
        camOn={camOn}
        error={error}
        total={view.total}
        onRequest={requestMedia}
        onJoin={startSession}
        onLeave={onExit}
      />
    );
  }

  // ---------------------------------------------------------------- live room
  const isCoding = view.kind === "coding";
  const scale = 1 + Math.min(volume, 1) * 0.12;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#0b0f1a]">
      {/* top bar */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          {callStatus === "live"
            ? <span className="flex items-center gap-1.5 rounded-full bg-danger/15 px-2.5 py-1 text-[11px] font-semibold text-danger"><span className="size-1.5 animate-pulse rounded-full bg-danger" /> REC</span>
            : <span className="flex items-center gap-1.5 text-[12px] text-faint"><Spinner /> Connecting…</span>}
          <span className="text-[12px] text-soft">Mock Interview</span>
          <span className="text-[11px] text-faint">· Q{view.answered + 1} of {view.total}</span>
        </div>
        <span className="text-[11px] uppercase tracking-wide text-faint">{isCoding ? "Coding round" : "Voice round"}</span>
      </div>

      {isCoding ? (
        /* ---- screen-share layout: code (big, left) + two participant squares (right) ---- */
        <div className="grid gap-3 p-3 lg:grid-cols-[1fr_220px]">
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted">Shared editor</span>
              <select value={lang} onChange={(e) => { setLang(e.target.value as Lang); setRunOutput(""); }} className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[12px] text-soft outline-none focus:border-cyan/50">
                {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            <div className="overflow-hidden rounded-xl border border-line-strong">
              <CodeMirror value={code} height="320px" theme={oneDark} extensions={[EXT[lang]()]} onChange={setCode} basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, bracketMatching: true, closeBrackets: true }} />
            </div>
            {view.runnable ? (
              <Button type="button" onClick={runCode} loading={running} loadingText="Running…" className="mt-2 rounded-lg border border-cyan/35 bg-cyan/10 px-3 py-1.5 text-[12px] font-semibold text-cyan">▶ Run</Button>
            ) : null}
            {runOutput ? <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-[#0a0e1a] p-3 font-mono text-[11.5px] text-soft">{runOutput}</pre> : null}
          </div>
          <div className="flex flex-row gap-3 lg:flex-col">
            <InterviewerTile speaking={speaking} scale={scale} compact />
            <SelfTile videoRef={videoRef} camOn={camOn} muted={muted} compact />
          </div>
        </div>
      ) : (
        /* ---- google-meet layout: interviewer big stage + self PiP ---- */
        <div className="relative p-3">
          <div className="relative mx-auto aspect-video w-full max-w-[640px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1a2e] to-[#0c1020]">
            <InterviewerTile speaking={speaking} scale={scale} />
            {/* self PiP */}
            <div className="absolute bottom-3 right-3 w-32 overflow-hidden rounded-xl border border-line-strong bg-black shadow-lg sm:w-40">
              <SelfTile videoRef={videoRef} camOn={camOn} muted={muted} compact />
            </div>
          </div>
        </div>
      )}

      {/* question caption */}
      <div className="mx-3 rounded-xl border border-line bg-card px-4 py-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-cyan">Interviewer asks</p>
        <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-soft">{view.question}</p>
      </div>

      {/* your answer */}
      <div className="px-3 pt-3">
        <p className="mb-1 text-[11px] font-semibold text-muted">{isCoding ? "Spoken explanation (optional)" : "Your answer — speak, or type to edit"}</p>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={isCoding ? 2 : 3}
          placeholder={callStatus === "live" ? "Your words appear here as you speak…" : "Connecting…"}
          className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint"
        />
      </div>

      {error ? <p className="px-3 pt-2 text-[12px] text-warning">{error}</p> : null}

      <div className="px-3 pb-3 pt-2">
        <Button type="button" onClick={submit} loading={submitting} loadingText="Submitting…" className="w-full rounded-xl bg-accent-gradient py-2.5 text-[13.5px] font-semibold text-on-accent">
          {view.answered + 1 >= view.total ? "Submit & finish →" : "Submit & next question →"}
        </Button>
      </div>

      {/* control bar */}
      <ControlBar muted={muted} camOn={camOn} onToggleMute={toggleMute} onToggleCam={toggleCam} onEnd={() => { endSession(); onExit(); }} />
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

function Lobby({
  videoRef, permission, camOn, error, total, onRequest, onJoin, onLeave,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  permission: "idle" | "requesting" | "granted" | "denied";
  camOn: boolean;
  error: string | null;
  total: number;
  onRequest: () => void;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const granted = permission === "granted";
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#0b0f1a] p-4">
      <p className="mb-3 text-center text-[13px] text-soft">Live voice interview · {total} questions. The interviewer speaks each question; you answer out loud.</p>
      <div className="relative mx-auto aspect-video w-full max-w-[440px] overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="size-full -scale-x-100 object-cover" />
        {!camOn || !granted ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            {permission === "requesting" ? <Spinner className="text-cyan" /> : <span className="text-3xl">🎥</span>}
            <p className="px-6 text-[12px] text-faint">
              {permission === "requesting" ? "Requesting camera & microphone…"
                : permission === "denied" ? "Camera & mic are blocked. Allow them in your browser, then retry."
                  : "Camera preview"}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mx-auto mt-3 max-w-[440px]">
        <div className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium ${granted ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}`}>
          {granted ? "✓ Camera & microphone ready" : "Camera and microphone are required for this interview"}
        </div>
        {error ? <p className="mt-2 text-center text-[12px] text-warning">{error}</p> : null}

        <div className="mt-3 flex items-center justify-center gap-2">
          {permission === "denied" ? (
            <Button type="button" onClick={onRequest} className="rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13px] font-semibold text-soft hover:text-cyan">Retry permissions</Button>
          ) : (
            <Button type="button" onClick={onJoin} loading={permission === "requesting"} loadingText="Joining…" disabled={!granted} className="rounded-xl bg-accent-gradient px-6 py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(34,211,238,0.3)] disabled:opacity-50">
              Join interview →
            </Button>
          )}
          <button type="button" onClick={onLeave} className="rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13px] font-semibold text-faint hover:text-soft">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function InterviewerTile({ speaking, scale, compact = false }: { speaking: boolean; scale: number; compact?: boolean }) {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#11203a] to-[#0c1224] ${compact ? "aspect-square w-full" : "size-full"}`}>
      <div className="relative flex items-center justify-center">
        {speaking ? (
          <>
            <span className="voice-ring absolute inset-0 rounded-full border-2 border-cyan/50" />
            <span className="voice-ring absolute inset-0 rounded-full border-2 border-cyan/40" style={{ animationDelay: "0.6s" }} />
            <span className="voice-ring absolute inset-0 rounded-full border-2 border-indigo/40" style={{ animationDelay: "1.2s" }} />
          </>
        ) : null}
        <div
          className={`relative flex items-center justify-center rounded-full bg-accent-gradient font-display font-bold text-on-accent shadow-[0_0_30px_rgba(34,211,238,0.35)] transition-transform duration-100 ${compact ? "size-14 text-lg" : "size-24 text-3xl"}`}
          style={{ transform: speaking ? `scale(${scale})` : "scale(1)" }}
        >
          AI
        </div>
      </div>
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-0.5 text-[11px] text-soft backdrop-blur">
        {speaking ? <span className="size-1.5 animate-pulse rounded-full bg-cyan" /> : null}
        Interviewer
      </div>
    </div>
  );
}

function SelfTile({ videoRef, camOn, muted, compact = false }: { videoRef: React.RefObject<HTMLVideoElement | null>; camOn: boolean; muted: boolean; compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-black ${compact ? "aspect-square w-full" : "size-full"}`}>
      <video ref={videoRef} autoPlay muted playsInline className={`size-full -scale-x-100 object-cover ${camOn ? "" : "opacity-0"}`} />
      {!camOn ? <div className="absolute inset-0 flex items-center justify-center text-2xl">🙈</div> : null}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] text-soft backdrop-blur">
        {muted ? <span className="text-danger">🔇</span> : null}You
      </div>
    </div>
  );
}

function ControlBar({ muted, camOn, onToggleMute, onToggleCam, onEnd }: { muted: boolean; camOn: boolean; onToggleMute: () => void; onToggleCam: () => void; onEnd: () => void }) {
  const pill = "flex size-11 items-center justify-center rounded-full border text-lg transition-colors";
  return (
    <div className="flex items-center justify-center gap-3 border-t border-line bg-[#0a0e1a] py-3">
      <button type="button" onClick={onToggleMute} title={muted ? "Unmute" : "Mute"} className={`${pill} ${muted ? "border-danger/40 bg-danger/15 text-danger" : "border-line-strong bg-surface text-soft hover:text-cyan"}`}>
        {muted ? "🔇" : "🎙️"}
      </button>
      <button type="button" onClick={onToggleCam} title={camOn ? "Turn camera off" : "Turn camera on"} className={`${pill} ${camOn ? "border-line-strong bg-surface text-soft hover:text-cyan" : "border-danger/40 bg-danger/15 text-danger"}`}>
        {camOn ? "📹" : "🚫"}
      </button>
      {/* red hang-up — ends the interview */}
      <button type="button" onClick={onEnd} title="End interview" className="flex h-11 items-center gap-2 rounded-full bg-danger px-5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(251,113,133,0.4)] transition-transform hover:-translate-y-0.5">
        <span className="text-lg leading-none">📞</span> End
      </button>
    </div>
  );
}
