"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { submitDesignAction, type SystemDesignFormState } from "@/lib/actions/system-design";
import { Palette } from "@/components/system-design/palette";
import { SYSTEM_DESIGN_NODE_TYPES } from "@/components/system-design/canvas-node";
import { ReviewPanel } from "@/components/system-design/review-panel";
import { COMPONENT_LABEL } from "@/components/system-design/component-types";
import type { SystemDesignScenario } from "@/lib/system-design/catalog";
import type { SystemDesignReview } from "@studentos/ai";

let nodeIdCounter = 0;
function nextNodeId() {
  nodeIdCounter += 1;
  return `n${Date.now()}_${nodeIdCounter}`;
}

function Canvas({
  initialNodes,
  initialEdges,
  onCanvasChange,
}: {
  initialNodes: Node[];
  initialEdges: Edge[];
  onCanvasChange: (nodes: Node[], edges: Edge[]) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    onCanvasChange(nodes, edges);
  }, [nodes, edges, onCanvasChange]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/x-system-design-kind");
    if (!kind) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const newNode: Node = {
      id: nextNodeId(),
      type: "component",
      position,
      data: { kind, label: COMPONENT_LABEL[kind] ?? kind },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  return (
    <div
      className="h-full w-full"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={SYSTEM_DESIGN_NODE_TYPES}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable className="!bg-card" />
      </ReactFlow>
    </div>
  );
}

export function DesignWorkspace({
  scenario,
  initialCanvas,
  initialReview,
}: {
  scenario: SystemDesignScenario;
  initialCanvas?: { nodes: Node[]; edges: Edge[] };
  initialReview?: SystemDesignReview | null;
}) {
  const [submitState, submitAction, submitPending] = useActionState<SystemDesignFormState, FormData>(submitDesignAction, {});
  const [canvasState, setCanvasState] = useState<{ nodes: Node[]; edges: Edge[] }>(
    initialCanvas ?? { nodes: [], edges: [] },
  );

  const onCanvasChange = useCallback(
    (n: Node[], e: Edge[]) => setCanvasState({ nodes: n, edges: e }),
    [],
  );

  const canvasPayload = useMemo(
    () => ({
      nodes: canvasState.nodes.map((n) => ({ id: n.id, kind: String(n.data.kind), label: String(n.data.label), position: n.position })),
      edges: canvasState.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    }),
    [canvasState],
  );
  const canvasJson = useMemo(() => JSON.stringify(canvasPayload), [canvasPayload]);

  // Autosave the in-progress canvas — debounced, silent, no AI cost — so a reload never loses
  // un-submitted work. Skips the very first render (that's just what the server already gave us).
  // Comparing against the ORIGINAL canvasPayload reference (captured once) rather than a mutable
  // ref flag is what makes this safe under React Strict Mode's dev-only double-invoke: a flag like
  // "have we run yet" gets flipped by the first invocation and wrongly lets a spurious second one
  // through, firing an unnecessary save of unchanged data.
  const initialCanvasPayloadRef = useRef(canvasPayload);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => {
    if (canvasPayload === initialCanvasPayloadRef.current) return;
    if (canvasPayload.nodes.length === 0) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      fetch("/api/system-design/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: scenario.slug, canvas: canvasPayload }),
      })
        .then((res) => setSaveStatus(res.ok ? "saved" : "idle"))
        .catch(() => setSaveStatus("idle"));
    }, 1200);
    return () => clearTimeout(timer);
  }, [canvasPayload, scenario.slug]);

  const review = submitState.review ?? initialReview ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_320px]">
      <Palette />

      <div className="h-[65vh] min-h-[420px] overflow-hidden rounded-2xl border border-line bg-surface lg:h-[calc(100vh-220px)]">
        <ReactFlowProvider>
          <Canvas
            initialNodes={canvasState.nodes}
            initialEdges={canvasState.edges}
            onCanvasChange={onCanvasChange}
          />
        </ReactFlowProvider>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-right text-[11px] text-faint">
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : ""}
        </p>
        <form action={submitAction}>
          <input type="hidden" name="slug" value={scenario.slug} />
          <input type="hidden" name="canvas" value={canvasJson} />
          <button
            type="submit"
            disabled={submitPending || canvasState.nodes.length === 0}
            className="w-full rounded-xl bg-accent-gradient py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(246,146,30,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {submitPending ? "Reviewing…" : "Get AI Review →"}
          </button>
        </form>

        {submitState.error ? (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-[12.5px] text-danger">{submitState.error}</p>
        ) : null}

        {review ? (
          <ReviewPanel review={review} />
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-card p-4 text-[12.5px] leading-relaxed text-muted">
            Build your architecture on the canvas, then submit for an AI review — bottlenecks, missing components, and suggestions will show up here.
          </div>
        )}
      </div>
    </div>
  );
}
