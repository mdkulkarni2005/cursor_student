"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Palette } from "@/components/circuits/palette";
import { Toolbar } from "@/components/circuits/toolbar";
import { PropertiesPanel } from "@/components/circuits/properties-panel";
import { CIRCUIT_NODE_TYPES, type CircuitNodeData } from "@/components/circuits/circuit-node";
import { COMPONENT_META, REFERENCE_PREFIX, WIRE_STYLE } from "@/lib/circuits/component-defaults";
import { solveDcCircuit } from "@/lib/circuits/solve";
import type { CircuitComponentKind, CircuitNode as PersistedNode, CircuitEdge as PersistedEdge } from "@/lib/circuits/types";

const GRID_SIZE = 20;

function toPersisted(nodes: Node[], edges: Edge[]): { nodes: PersistedNode[]; edges: PersistedEdge[] } {
  return {
    nodes: nodes.map((n) => {
      const d = n.data as unknown as CircuitNodeData;
      return { id: n.id, kind: d.kind, label: d.label, value: d.value, closed: d.closed, position: n.position };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: (e.sourceHandle as "a" | "b" | null) ?? "a",
      targetHandle: (e.targetHandle as "a" | "b" | null) ?? "a",
    })),
  };
}

/** Next reference designator for a kind (R1, R2, ...), continuing from whatever's already on the sheet. */
function nextDesignator(nodes: Node[], kind: CircuitComponentKind): string {
  const prefix = REFERENCE_PREFIX[kind];
  let max = 0;
  for (const n of nodes) {
    const d = n.data as unknown as CircuitNodeData;
    if (d.kind !== kind) continue;
    const match = d.label.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${max + 1}`;
}

export type CanvasHandle = {
  run: () => void;
  clearAll: () => void;
  deleteNode: (id: string) => void;
};

const Canvas = forwardRef<
  CanvasHandle,
  {
    initialNodes: Node[];
    initialEdges: Edge[];
    onCanvasChange: (nodes: Node[], edges: Edge[]) => void;
    onRunResult: (error: string | null) => void;
    onSelectionChange: (node: Node | null) => void;
  }
>(function Canvas({ initialNodes, initialEdges, onCanvasChange, onRunResult, onSelectionChange }, ref) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    onCanvasChange(nodes, edges);
  }, [nodes, edges, onCanvasChange]);

  // Imperative actions triggered by the parent (Run button, Properties panel's Delete, Clear
  // sheet) — only ever fire in response to a real click, never automatically on mount, so unlike
  // an effect-based "run on change" approach this has no React Strict Mode double-invoke hazard.
  useImperativeHandle(
    ref,
    () => ({
      run: () => {
        const { nodes: pNodes, edges: pEdges } = toPersisted(nodes, edges);
        const result = solveDcCircuit(pNodes, pEdges);
        if (!result.ok) {
          onRunResult(result.error);
          setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, reading: undefined } })));
          return;
        }
        onRunResult(null);
        setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, reading: result.readings[n.id] } })));
      },
      clearAll: () => {
        setNodes([]);
        setEdges([]);
        onRunResult(null);
      },
      deleteNode: (id: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        onSelectionChange(null);
      },
    }),
    [nodes, edges, onRunResult, onSelectionChange, setNodes, setEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, ...WIRE_STYLE }, eds)),
    [setEdges],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => onSelectionChange(selectedNodes[0] ?? null),
    [onSelectionChange],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/x-circuit-kind") as CircuitComponentKind;
    if (!kind) return;
    const meta = COMPONENT_META[kind];
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const id = `n${Date.now()}_${Math.round(Math.random() * 1e4)}`;
    setNodes((nds) => {
      const label = nextDesignator(nds, kind);
      const newNode: Node = {
        id,
        type: "component",
        position,
        data: {
          kind,
          label,
          value: meta.defaultValue,
          unit: meta.unit,
          closed: kind === "switch" ? true : undefined,
          onValueChange: (value: number) => setNodes((cur) => cur.map((n) => (n.id === id ? { ...n, data: { ...n.data, value } } : n))),
          onToggleSwitch: () => setNodes((cur) => cur.map((n) => (n.id === id ? { ...n, data: { ...n.data, closed: !(n.data as unknown as CircuitNodeData).closed } } : n))),
        } satisfies CircuitNodeData,
      };
      return [...nds, newNode];
    });
  }

  return (
    <div className="h-full w-full" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={handleSelectionChange}
        nodeTypes={CIRCUIT_NODE_TYPES}
        defaultEdgeOptions={WIRE_STYLE}
        snapToGrid
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} gap={GRID_SIZE} color="rgba(255,255,255,0.045)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
});

export function CircuitWorkspace({ initialCanvas, studentName }: { initialCanvas?: { nodes: Node[]; edges: Edge[] }; studentName?: string }) {
  const [canvasState, setCanvasState] = useState<{ nodes: Node[]; edges: Edge[] }>(initialCanvas ?? { nodes: [], edges: [] });
  const [runError, setRunError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const canvasRef = useRef<CanvasHandle>(null);

  const onCanvasChange = useCallback((n: Node[], e: Edge[]) => setCanvasState({ nodes: n, edges: e }), []);

  // Autosave — debounced, silent, no AI cost. Comparing against the ORIGINAL canvasState
  // reference (captured once) rather than a mutable ref flag is what makes "skip the initial
  // no-op render" safe under React Strict Mode's dev-only double-invoke.
  const initialCanvasStateRef = useRef(canvasState);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => {
    if (canvasState === initialCanvasStateRef.current) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      const canvas = toPersisted(canvasState.nodes, canvasState.edges);
      fetch("/api/circuits/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvas }),
      })
        .then((res) => setSaveStatus(res.ok ? "saved" : "idle"))
        .catch(() => setSaveStatus("idle"));
    }, 1200);
    return () => clearTimeout(timer);
  }, [canvasState]);

  function runSimulation() {
    setHasRun(true);
    canvasRef.current?.run();
  }

  function clearAll() {
    setHasRun(false);
    setSelectedNode(null);
    canvasRef.current?.clearAll();
  }

  function deleteSelected(id: string) {
    canvasRef.current?.deleteNode(id);
  }

  const componentCount = canvasState.nodes.length;
  const selectedLive = selectedNode ? (canvasState.nodes.find((n) => n.id === selectedNode.id) ?? null) : null;

  return (
    <div className="flex flex-col gap-3">
      <Toolbar onClearAll={clearAll} onRun={runSimulation} disabled={componentCount === 0} componentCount={componentCount} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_260px]">
        <Palette />

        {/* Drafting-sheet frame — border + corner title block, like a real schematic printout. */}
        <div className="relative h-[65vh] min-h-[420px] overflow-hidden rounded-lg border-2 border-line/80 bg-[#0a0f18] lg:h-[calc(100vh-260px)]">
          <ReactFlowProvider>
            <Canvas
              ref={canvasRef}
              initialNodes={canvasState.nodes}
              initialEdges={canvasState.edges}
              onCanvasChange={onCanvasChange}
              onRunResult={setRunError}
              onSelectionChange={setSelectedNode}
            />
          </ReactFlowProvider>
          <div className="pointer-events-none absolute bottom-2 right-2 rounded border border-line/70 bg-[#0d1420]/95 px-3 py-1.5 font-mono text-[9.5px] leading-tight text-faint">
            <div className="font-bold tracking-wide text-muted">KRACKIT CIRCUIT BUILDER</div>
            {studentName ? <div>DRAWN BY: {studentName.toUpperCase()}</div> : null}
            <div>SHEET 1/1 · DC ANALYSIS</div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-right text-[11px] text-faint">{saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : ""}</p>

          {runError ? (
            <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-[12.5px] text-danger">{runError}</p>
          ) : hasRun ? (
            <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-[12.5px] text-success">
              Simulated — readings shown on each component.
            </p>
          ) : null}

          <PropertiesPanel selected={selectedLive} onDelete={deleteSelected} />
        </div>
      </div>
    </div>
  );
}
