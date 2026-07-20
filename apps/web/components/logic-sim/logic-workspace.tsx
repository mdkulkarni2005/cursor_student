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
import { Palette } from "@/components/logic-sim/palette";
import { Toolbar } from "@/components/logic-sim/toolbar";
import { PropertiesPanel } from "@/components/logic-sim/properties-panel";
import { TruthTable } from "@/components/logic-sim/truth-table";
import { LOGIC_NODE_TYPES, type LogicNodeData } from "@/components/logic-sim/logic-node";
import { REFERENCE_PREFIX, WIRE_STYLE } from "@/lib/logic-sim/gate-defaults";
import { evaluateLogic, nextFlipFlopStates, generateTruthTable } from "@/lib/logic-sim/solve";
import type { GateKind, LogicNode as PersistedNode, LogicEdge as PersistedEdge, TruthTable as TruthTableResult } from "@/lib/logic-sim/types";

const GRID_SIZE = 20;

function toPersisted(nodes: Node[], edges: Edge[]): { nodes: PersistedNode[]; edges: PersistedEdge[] } {
  return {
    nodes: nodes.map((n) => {
      const d = n.data as unknown as LogicNodeData;
      return { id: n.id, kind: d.kind, label: d.label, state: d.state, position: n.position };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? "out",
      targetHandle: e.targetHandle ?? "in0",
    })),
  };
}

function nextDesignator(nodes: Node[], kind: GateKind): string {
  const prefix = REFERENCE_PREFIX[kind];
  let max = 0;
  for (const n of nodes) {
    const d = n.data as unknown as LogicNodeData;
    if (d.kind !== kind) continue;
    const match = d.label.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${max + 1}`;
}

export type CanvasHandle = {
  run: () => void;
  clockPulse: () => void;
  clearAll: () => void;
  deleteNode: (id: string) => void;
};

const Canvas = forwardRef<
  CanvasHandle,
  {
    initialNodes: Node[];
    initialEdges: Edge[];
    onCanvasChange: (nodes: Node[], edges: Edge[]) => void;
    onRunResult: (error: string | null, table: TruthTableResult | null) => void;
    onSelectionChange: (node: Node | null) => void;
  }
>(function Canvas({ initialNodes, initialEdges, onCanvasChange, onRunResult, onSelectionChange }, ref) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    onCanvasChange(nodes, edges);
  }, [nodes, edges, onCanvasChange]);

  // Switch toggle handlers are functions, so they can't round-trip through the JSON autosave —
  // nodes restored from a saved draft arrive without one. Rebind once on mount so a reloaded
  // bench's switches are clickable again, same as freshly-dropped ones.
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        const d = n.data as unknown as LogicNodeData;
        if (d.kind !== "input" || d.onToggle) return n;
        return {
          ...n,
          data: { ...d, onToggle: () => setNodes((cur) => cur.map((m) => (m.id === n.id ? { ...m, data: { ...m.data, state: !(m.data as unknown as LogicNodeData).state } } : m))) },
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Evaluate a specific (node, edge) pair and push readings — factored out of `run` so
   *  `clockPulse` can run it against the just-updated flip-flop states in the same tick, instead
   *  of a stale pre-pulse closure. */
  const evaluateAndApply = useCallback(
    (pNodes: ReturnType<typeof toPersisted>["nodes"], pEdges: ReturnType<typeof toPersisted>["edges"]) => {
      const result = evaluateLogic(pNodes, pEdges);
      if (!result.ok) {
        onRunResult(result.error, null);
        setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, reading: undefined } })));
        return;
      }
      const table = generateTruthTable(pNodes, pEdges);
      onRunResult(null, table.ok ? table : null);
      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, reading: result.readings[n.id] } })));
    },
    [onRunResult, setNodes],
  );

  const runInternal = useCallback(() => {
    const { nodes: pNodes, edges: pEdges } = toPersisted(nodes, edges);
    evaluateAndApply(pNodes, pEdges);
  }, [nodes, edges, evaluateAndApply]);

  useImperativeHandle(
    ref,
    () => ({
      run: runInternal,
      clockPulse: () => {
        const { nodes: pNodes, edges: pEdges } = toPersisted(nodes, edges);
        const next = nextFlipFlopStates(pNodes, pEdges);
        const updatedNodes = pNodes.map((n) => (next.has(n.id) ? { ...n, state: next.get(n.id) } : n));
        setNodes((nds) => nds.map((n) => (next.has(n.id) ? { ...n, data: { ...n.data, state: next.get(n.id) } } : n)));
        // Evaluate against the just-latched Q values directly — not the pre-pulse `nodes`
        // closure — so downstream gates/LEDs update on this same click, not the next pulse.
        evaluateAndApply(updatedNodes, pEdges);
      },
      clearAll: () => {
        setNodes([]);
        setEdges([]);
        onRunResult(null, null);
      },
      deleteNode: (id: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        onSelectionChange(null);
      },
    }),
    [nodes, edges, runInternal, evaluateAndApply, onRunResult, onSelectionChange, setNodes, setEdges],
  );

  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge({ ...connection, ...WIRE_STYLE }, eds)), [setEdges]);

  const handleSelectionChange = useCallback(({ nodes: selectedNodes }: OnSelectionChangeParams) => onSelectionChange(selectedNodes[0] ?? null), [onSelectionChange]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/x-logic-kind") as GateKind;
    if (!kind) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const id = `n${Date.now()}_${Math.round(Math.random() * 1e4)}`;
    setNodes((nds) => {
      const label = nextDesignator(nds, kind);
      const newNode: Node = {
        id,
        type: "gate",
        position,
        data: {
          kind,
          label,
          state: kind === "input" || kind === "dff" ? false : undefined,
          onToggle: kind === "input" ? () => setNodes((cur) => cur.map((n) => (n.id === id ? { ...n, data: { ...n.data, state: !(n.data as unknown as LogicNodeData).state } } : n))) : undefined,
        } satisfies LogicNodeData,
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
        nodeTypes={LOGIC_NODE_TYPES}
        defaultEdgeOptions={WIRE_STYLE}
        snapToGrid
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} gap={GRID_SIZE} color="rgba(124,255,107,0.045)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
});

export function LogicWorkspace({ initialCanvas, studentName }: { initialCanvas?: { nodes: Node[]; edges: Edge[] }; studentName?: string }) {
  const [canvasState, setCanvasState] = useState<{ nodes: Node[]; edges: Edge[] }>(initialCanvas ?? { nodes: [], edges: [] });
  const [runError, setRunError] = useState<string | null>(null);
  const [truthTable, setTruthTable] = useState<TruthTableResult | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const canvasRef = useRef<CanvasHandle>(null);

  const onCanvasChange = useCallback((n: Node[], e: Edge[]) => setCanvasState({ nodes: n, edges: e }), []);

  const initialCanvasStateRef = useRef(canvasState);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => {
    if (canvasState === initialCanvasStateRef.current) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      const canvas = toPersisted(canvasState.nodes, canvasState.edges);
      fetch("/api/logic-sim/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvas }),
      })
        .then((res) => setSaveStatus(res.ok ? "saved" : "idle"))
        .catch(() => setSaveStatus("idle"));
    }, 1200);
    return () => clearTimeout(timer);
  }, [canvasState]);

  function onRunResult(error: string | null, table: TruthTableResult | null) {
    setRunError(error);
    setTruthTable(table);
  }

  function runSimulation() {
    setHasRun(true);
    canvasRef.current?.run();
  }

  function clockPulse() {
    canvasRef.current?.clockPulse();
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
  const hasFlipFlop = canvasState.nodes.some((n) => (n.data as unknown as LogicNodeData).kind === "dff");
  const selectedLive = selectedNode ? (canvasState.nodes.find((n) => n.id === selectedNode.id) ?? null) : null;

  return (
    <div className="flex flex-col gap-3">
      <Toolbar onClearAll={clearAll} onRun={runSimulation} onClockPulse={clockPulse} hasFlipFlop={hasFlipFlop} disabled={componentCount === 0} componentCount={componentCount} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_280px]">
        <Palette />

        <div className="relative h-[65vh] min-h-[420px] overflow-hidden rounded-lg border-2 border-line/80 bg-[#050f08] lg:h-[calc(100vh-260px)]">
          <ReactFlowProvider>
            <Canvas ref={canvasRef} initialNodes={canvasState.nodes} initialEdges={canvasState.edges} onCanvasChange={onCanvasChange} onRunResult={onRunResult} onSelectionChange={setSelectedNode} />
          </ReactFlowProvider>
          <div className="pointer-events-none absolute bottom-2 right-2 rounded border border-line/70 bg-[#081208]/95 px-3 py-1.5 font-mono text-[9.5px] leading-tight text-faint">
            <div className="font-bold tracking-wide text-scope/80">KRACKIT LOGIC BENCH</div>
            {studentName ? <div>DRAWN BY: {studentName.toUpperCase()}</div> : null}
            <div>SHEET 1/1 · BOOLEAN ANALYSIS</div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-right text-[11px] text-faint">{saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : ""}</p>

          {hasRun && !runError ? (
            <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-[12.5px] text-success">Simulated — readings shown on each gate.</p>
          ) : null}

          <PropertiesPanel selected={selectedLive} onDelete={deleteSelected} />
          {hasRun ? <TruthTable table={truthTable} error={runError} /> : null}
        </div>
      </div>
    </div>
  );
}
