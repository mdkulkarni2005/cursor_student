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
import type { QuestionItem } from "@studentos/ai";
import { interviewer, interviewerVariableValues } from "@/lib/interview/vapi-assistant";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

type Lang = "python" | "javascript" | "typescript" | "java" | "cpp";
const LANGS: { id: Lang; label: string }[] = [
  { id: "python", label: "Python" }, { id: "javascript", label: "JavaScript" }, { id: "typescript", label: "TypeScript" }, { id: "java", label: "Java" }, { id: "cpp", label: "C++" },
];
const EXT: Record<Lang, () => Extension> = {
  python: () => python(), javascript: () => javascript(), typescript: () => javascript({ typescript: true }), java: () => java(), cpp: () => cpp(),
};

type VapiMsg = { type?: string; role?: string; transcript?: string; transcriptType?: string };
type Turn = { role: "assistant" | "user"; content: string };

const MAX_CALL_MS = 20 * 60_000; // hard cap on the whole session (credit guard)

/**
 * Live voice interview (adrianhajdin/ai_mock_interviews pattern): an inline VAPI assistant conducts
 * the whole conversation from the resume-grounded questions injected via variableValues — intro,
 * questions, barge-in, all native. We capture the transcript client-side and, on End, POST it to
 * our server to evaluate (Sonnet). For coding rounds an editor is available; its code is folded into
 * the transcript at the end. No webhook / public URL needed for this flow.
 */
export function InterviewLiveSession({
  docId, role, candidateName, questions, onExit,
}: {
  docId: string;
  role: string;
  candidateName: string;
  questions: QuestionItem[];
  onExit: () => void;
}) {
  const router = useRouter();
  const codingQuestions = questions.filter((q) => q.kind === "coding");
  const codingIncluded = codingQuestions.length > 0;

  const [callStatus, setCallStatus] = useState<"idle" | "connecting" | "live" | "ended" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [lastLine, setLastLine] = useState("");

  // media gate — camera AND mic are mandatory before joining
  const [permission, setPermission] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [camOn, setCamOn] = useState(true);
  const [muted, setMuted] = useState(false);

  // active-speaker animation
  const [speaking, setSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);

  // coding editor (available throughout when the interview has a coding round)
  const [lang, setLang] = useState<Lang>("python");
  const [code, setCode] = useState("");
  const [runOutput, setRunOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [editorOpen, setEditorOpen] = useState(codingIncluded);

  const videoRef = useRef<HTMLVideoElement>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<Turn[]>([]); // captured transcript (handlers register once → use a ref)
  const finalizingRef = useRef(false);
  const endingRef = useRef(false);
  const codeRef = useRef("");
  const runOutputRef = useRef("");
  const langRef = useRef<Lang>("python");
  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { runOutputRef.current = runOutput; }, [runOutput]);
  useEffect(() => { langRef.current = lang; }, [lang]);

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
  }, [callStatus, permission, camOn]);

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
        timerRef.current = setTimeout(() => void finalize(), MAX_CALL_MS);
      });
      vapi.on("call-end", () => {
        if (finalizingRef.current) return; // we ended deliberately (End button / cap) — already finalizing
        // Unexpected end: only auto-evaluate if there's a real conversation; otherwise it was a drop
        // early on — let them rejoin instead of scoring an empty interview.
        const userTurns = messagesRef.current.filter((t) => t.role === "user").length;
        if (userTurns >= 2) { void finalize(); return; }
        setSpeaking(false);
        setCallStatus("error");
        setError("The call ended early. You can rejoin to continue.");
      });
      vapi.on("speech-start", () => setSpeaking(true));
      vapi.on("speech-end", () => { setSpeaking(false); setVolume(0); });
      vapi.on("volume-level", (v: number) => setVolume(typeof v === "number" ? v : 0));
      vapi.on("error", (e: unknown) => {
        // VAPI/Daily emits an "error" when the meeting simply ends — not a failure.
        const msg = (typeof e === "string" ? e : (e as { message?: string; errorMsg?: string } | null)?.message ?? (e as { errorMsg?: string } | null)?.errorMsg ?? "").toLowerCase();
        const benignEnd = /ended|ejection|meeting has ended|left the meeting/.test(msg);
        // A benign "meeting ended" just stops the speaking animation; the `call-end` handler decides
        // whether to finalize or offer a rejoin. Only surface a real connection failure.
        if (benignEnd || endingRef.current) { setSpeaking(false); return; }
        setError("Voice connection dropped. Try rejoining."); setCallStatus("error"); console.warn("[vapi]", e);
      });
      vapi.on("message", (m: VapiMsg) => {
        if (m.type !== "transcript" || m.transcriptType !== "final" || !m.transcript) return;
        const turn: Turn = { role: m.role === "user" ? "user" : "assistant", content: m.transcript };
        messagesRef.current = [...messagesRef.current, turn];
        setLastLine(m.transcript);
      });
      await vapi.start(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        interviewer as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { variableValues: interviewerVariableValues({ questions, role, candidateName }) } as any,
      );
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

  /** End the interview → fold in any code → evaluate the transcript on the server → show the report. */
  async function finalize() {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    endingRef.current = true;
    setEnding(true);
    const turns: Turn[] = [...messagesRef.current];
    if (codingIncluded && codeRef.current.trim()) {
      turns.push({
        role: "user",
        content: `[My code solution (${langRef.current})]:\n${codeRef.current}${runOutputRef.current ? `\n\n[Program output]:\n${runOutputRef.current}` : ""}`,
      });
    }
    stopEverything();
    setSpeaking(false);
    setCallStatus("ended");
    try {
      const res = await fetch("/api/interview/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, transcript: turns }),
      });
      const d = await res.json();
      if (d?.error) {
        // Keep the user on the wrapping-up screen with a Retry — the transcript is still in
        // messagesRef, so retrying just re-POSTs it (no need to rejoin the call).
        setError(d.error);
        finalizingRef.current = false;
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't generate your feedback — tap Retry.");
      finalizingRef.current = false; // allow retry; KEEP `ending` true so the retry screen stays
    }
  }

  const scale = 1 + Math.min(volume, 1) * 0.12;

  // ---------------------------------------------------------------- finalizing (ending → eval)
  if (ending) {
    const failed = !!error; // feedback POST failed → offer Retry (transcript is still in messagesRef)
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center">
        {failed ? (
          <>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-warning/15 text-2xl">⚠️</div>
            <p className="text-[15px] font-semibold text-ink">Couldn’t generate your feedback</p>
            <p className="mt-1 text-[12.5px] text-warning">{error}</p>
            <Button type="button" onClick={() => { setError(null); void finalize(); }} className="mt-4 rounded-xl bg-accent-gradient px-5 py-2.5 text-[13px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(34,211,238,0.3)]">Retry →</Button>
          </>
        ) : (
          <>
            <Spinner className="mx-auto mb-2 text-cyan" />
            <p className="text-[15px] font-semibold text-ink">Wrapping up</p>
            <p className="mt-1 text-[13px] text-muted">Preparing your evaluation…</p>
          </>
        )}
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
        codingIncluded={codingIncluded}
        onRequest={requestMedia}
        onJoin={startSession}
        onLeave={onExit}
      />
    );
  }

  // ---------------------------------------------------------------- live room
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#0b0f1a]">
      {/* top bar */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          {callStatus === "live"
            ? <span className="flex items-center gap-1.5 rounded-full bg-danger/15 px-2.5 py-1 text-[11px] font-semibold text-danger"><span className="size-1.5 animate-pulse rounded-full bg-danger" /> REC</span>
            : <span className="flex items-center gap-1.5 text-[12px] text-faint"><Spinner /> Connecting…</span>}
          <span className="text-[12px] text-soft">Mock Interview</span>
        </div>
        {codingIncluded ? (
          <button type="button" onClick={() => setEditorOpen((v) => !v)} className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-semibold text-soft transition-colors hover:text-cyan">
            {editorOpen ? "Hide editor" : "💻 Open editor"}
          </button>
        ) : <span className="text-[11px] uppercase tracking-wide text-faint">Voice round</span>}
      </div>

      {/* google-meet stage: interviewer big + self PiP */}
      <div className="relative p-3">
        <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1a2e] to-[#0c1020]">
          <InterviewerTile speaking={speaking} scale={scale} />
          <div className="absolute bottom-3 right-3 w-32 overflow-hidden rounded-xl border border-line-strong bg-black shadow-lg sm:w-40">
            <SelfTile videoRef={videoRef} camOn={camOn} muted={muted} compact />
          </div>
        </div>
      </div>

      {/* coding editor — available throughout when the interview includes a coding round */}
      {codingIncluded && editorOpen ? (
        <div className="mx-3 mb-1 rounded-xl border border-line-strong bg-card p-3">
          {codingQuestions.length ? (
            <div className="mb-2 rounded-lg border border-cyan/20 bg-cyan/[0.05] px-3 py-2">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan">Coding task{codingQuestions.length > 1 ? "s" : ""}</p>
              {codingQuestions.map((q, i) => (
                <p key={i} className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-soft">{codingQuestions.length > 1 ? `${i + 1}. ` : ""}{q.question}</p>
              ))}
            </div>
          ) : null}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-muted">Your editor</span>
            <select value={lang} onChange={(e) => { setLang(e.target.value as Lang); setRunOutput(""); }} className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[12px] text-soft outline-none focus:border-cyan/50">
              {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <div className="overflow-hidden rounded-xl border border-line-strong">
            <CodeMirror value={code} height="220px" theme={oneDark} extensions={[EXT[lang]()]} onChange={setCode} basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, bracketMatching: true, closeBrackets: true }} />
          </div>
          <Button type="button" onClick={runCode} loading={running} loadingText="Running…" className="mt-2 rounded-lg border border-cyan/35 bg-cyan/10 px-3 py-1.5 text-[12px] font-semibold text-cyan">▶ Run</Button>
          {runOutput ? <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-[#0a0e1a] p-3 font-mono text-[11.5px] text-soft">{runOutput}</pre> : null}
        </div>
      ) : null}

      {/* ambient status — the assistant drives the whole interview */}
      <div className="px-3 pb-2 pt-3">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2.5">
          <span className="text-[12.5px] text-muted">🎙️ The interview is live — just talk naturally. {codingIncluded ? "Use the editor when asked, and say “I’m done”. " : ""}Press <span className="font-semibold text-soft">End &amp; evaluate</span> when you’re finished.</span>
        </div>
        {lastLine ? <p className="mt-1.5 truncate px-1 text-[11.5px] italic text-faint">“{lastLine}”</p> : null}
        {error ? <p className="mt-1.5 px-1 text-[12px] text-warning">{error}</p> : null}
      </div>

      {/* control bar — red button ends the interview and produces the evaluation */}
      <ControlBar muted={muted} camOn={camOn} ending={ending} onToggleMute={toggleMute} onToggleCam={toggleCam} onEnd={() => void finalize()} />
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

function Lobby({
  videoRef, permission, camOn, error, codingIncluded, onRequest, onJoin, onLeave,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  permission: "idle" | "requesting" | "granted" | "denied";
  camOn: boolean;
  error: string | null;
  codingIncluded: boolean;
  onRequest: () => void;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const granted = permission === "granted";
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#0b0f1a] p-4">
      <p className="mb-3 text-center text-[13px] text-soft">Live voice interview. The interviewer introduces itself, asks you to introduce yourself, then works through your questions — talk naturally, and you can interrupt it like a real call.{codingIncluded ? " For coding questions, write your solution in the editor and say “I’m done”." : ""} Press End when finished to get your feedback.</p>
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

function ControlBar({ muted, camOn, ending, onToggleMute, onToggleCam, onEnd }: { muted: boolean; camOn: boolean; ending: boolean; onToggleMute: () => void; onToggleCam: () => void; onEnd: () => void }) {
  const pill = "flex size-11 items-center justify-center rounded-full border text-lg transition-colors";
  return (
    <div className="flex items-center justify-center gap-3 border-t border-line bg-[#0a0e1a] py-3">
      <button type="button" onClick={onToggleMute} title={muted ? "Unmute" : "Mute"} className={`${pill} ${muted ? "border-danger/40 bg-danger/15 text-danger" : "border-line-strong bg-surface text-soft hover:text-cyan"}`}>
        {muted ? "🔇" : "🎙️"}
      </button>
      <button type="button" onClick={onToggleCam} title={camOn ? "Turn camera off" : "Turn camera on"} className={`${pill} ${camOn ? "border-line-strong bg-surface text-soft hover:text-cyan" : "border-danger/40 bg-danger/15 text-danger"}`}>
        {camOn ? "📹" : "🚫"}
      </button>
      {/* red hang-up — ends the interview and runs the evaluation */}
      <button type="button" onClick={onEnd} disabled={ending} title="End interview" className="flex h-11 items-center gap-2 rounded-full bg-danger px-5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(251,113,133,0.4)] transition-transform hover:-translate-y-0.5 disabled:opacity-70">
        {ending ? <><Spinner /> Ending…</> : <><span className="text-lg leading-none">📞</span> End &amp; evaluate</>}
      </button>
    </div>
  );
}
