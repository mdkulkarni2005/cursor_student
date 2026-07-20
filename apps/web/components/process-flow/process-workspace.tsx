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
import { Palette } from "@/components/process-flow/palette";
import { Toolbar } from "@/components/process-flow/toolbar";
import { PropertiesPanel } from "@/components/process-flow/properties-panel";
import { BalanceReport } from "@/components/process-flow/balance-report";
import { PROCESS_NODE_TYPES, type EquipmentNodeData } from "@/components/process-flow/equipment-node";
import { REFERENCE_PREFIX, STREAM_STYLE } from "@/lib/process-flow/equipment-defaults";
import { checkMassBalance } from "@/lib/process-flow/solve";
import type { EquipmentKind, ProcessNode as PersistedNode, ProcessEdge as PersistedEdge, BalanceResult } from "@/lib/process-flow/types";

const GRID_SIZE = 20;

function toPersisted(nodes: Node[], edges: Edge[]): { nodes: PersistedNode[]; edges: PersistedEdge[] } {
  return {
    nodes: nodes.map((n) => {
      const d = n.data as unknown as EquipmentNodeData;
      return { id: n.id, kind: d.kind, label: d.label, position: n.position };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? "out0",
      targetHandle: e.targetHandle ?? "in0",
      flowRate: (e.data as { flowRate?: number } | undefined)?.flowRate ?? 0,
    })),
  };
}

function nextDesignator(nodes: Node[], kind: EquipmentKind): string {
  const prefix = REFERENCE_PREFIX[kind];
  let max = 0;
  for (const n of nodes) {
    const d = n.data as unknown as EquipmentNodeData;
    if (d.kind !== kind) continue;
    const match = d.label.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${max + 1}`;
}

export type CanvasHandle = {
  check: () => void;
  clearAll: () => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  setFlowRate: (id: string, value: number) => void;
};

const Canvas = forwardRef<
  CanvasHandle,
  {
    initialNodes: Node[];
    initialEdges: Edge[];
    onCanvasChange: (nodes: Node[], edges: Edge[]) => void;
    onCheckResult: (result: BalanceResult) => void;
    onSelectionChange: (node: Node | null, edge: Edge | null) => void;
  }
>(function Canvas({ initialNodes, initialEdges, onCanvasChange, onCheckResult, onSelectionChange }, ref) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    onCanvasChange(nodes, edges);
  }, [nodes, edges, onCanvasChange]);

  useImperativeHandle(
    ref,
    () => ({
      check: () => {
        const { nodes: pNodes, edges: pEdges } = toPersisted(nodes, edges);
        const result = checkMassBalance(pNodes, pEdges);
        const imbalancedIds = new Set(result.issues.map((i) => i.nodeId));
        onCheckResult(result);
        setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, imbalanced: imbalancedIds.has(n.id) } })));
      },
      clearAll: () => {
        setNodes([]);
        setEdges([]);
      },
      deleteNode: (id: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        onSelectionChange(null, null);
      },
      deleteEdge: (id: string) => {
        setEdges((eds) => eds.filter((e) => e.id !== id));
        onSelectionChange(null, null);
      },
      setFlowRate: (id: string, value: number) => {
        setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, label: `${value} kg/h`, data: { ...e.data, flowRate: value } } : e)));
      },
    }),
    [nodes, edges, onCheckResult, onSelectionChange, setNodes, setEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, ...STREAM_STYLE, label: "10 kg/h", data: { flowRate: 10 } }, eds)),
    [setEdges],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => onSelectionChange(selectedNodes[0] ?? null, selectedEdges[0] ?? null),
    [onSelectionChange],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/x-equipment-kind") as EquipmentKind;
    if (!kind) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const id = `n${Date.now()}_${Math.round(Math.random() * 1e4)}`;
    setNodes((nds) => {
      const label = nextDesignator(nds, kind);
      const newNode: Node = { id, type: "equipment", position, data: { kind, label } satisfies EquipmentNodeData };
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
        nodeTypes={PROCESS_NODE_TYPES}
        defaultEdgeOptions={STREAM_STYLE}
        snapToGrid
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} gap={GRID_SIZE} color="rgba(255,159,107,0.05)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
});

export function ProcessWorkspace({ initialCanvas, studentName }: { initialCanvas?: { nodes: Node[]; edges: Edge[] }; studentName?: string }) {
  const [canvasState, setCanvasState] = useState<{ nodes: Node[]; edges: Edge[] }>(initialCanvas ?? { nodes: [], edges: [] });
  const [balanceResult, setBalanceResult] = useState<BalanceResult | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const canvasRef = useRef<CanvasHandle>(null);

  const onCanvasChange = useCallback((n: Node[], e: Edge[]) => setCanvasState({ nodes: n, edges: e }), []);

  const initialCanvasStateRef = useRef(canvasState);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => {
    if (canvasState === initialCanvasStateRef.current) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      const canvas = toPersisted(canvasState.nodes, canvasState.edges);
      fetch("/api/process-flow/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvas }),
      })
        .then((res) => setSaveStatus(res.ok ? "saved" : "idle"))
        .catch(() => setSaveStatus("idle"));
    }, 1200);
    return () => clearTimeout(timer);
  }, [canvasState]);

  function checkBalance() {
    canvasRef.current?.check();
  }

  function clearAll() {
    setBalanceResult(null);
    setSelectedNode(null);
    setSelectedEdge(null);
    canvasRef.current?.clearAll();
  }

  function onSelectionChange(node: Node | null, edge: Edge | null) {
    setSelectedNode(node);
    setSelectedEdge(edge);
  }

  const componentCount = canvasState.nodes.length;
  const selectedNodeLive = selectedNode ? (canvasState.nodes.find((n) => n.id === selectedNode.id) ?? null) : null;
  const selectedEdgeLive = selectedEdge ? (canvasState.edges.find((e) => e.id === selectedEdge.id) ?? null) : null;

  return (
    <div className="flex flex-col gap-3">
      <Toolbar onClearAll={clearAll} onCheck={checkBalance} disabled={componentCount === 0} componentCount={componentCount} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_290px]">
        <Palette />

        <div className="relative h-[65vh] min-h-[420px] overflow-hidden rounded-lg border-2 border-line/80 bg-[#0f0906] lg:h-[calc(100vh-260px)]">
          <ReactFlowProvider>
            <Canvas
              ref={canvasRef}
              initialNodes={canvasState.nodes}
              initialEdges={canvasState.edges}
              onCanvasChange={onCanvasChange}
              onCheckResult={setBalanceResult}
              onSelectionChange={onSelectionChange}
            />
          </ReactFlowProvider>
          <div className="pointer-events-none absolute bottom-2 right-2 rounded border border-line/70 bg-[#170d06]/95 px-3 py-1.5 font-mono text-[9.5px] leading-tight text-faint">
            <div className="font-bold tracking-wide text-flask/80">KRACKIT PROCESS SHEET</div>
            {studentName ? <div>DRAWN BY: {studentName.toUpperCase()}</div> : null}
            <div>SHEET 1/1 · MASS BALANCE</div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-right text-[11px] text-faint">{saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : ""}</p>

          <PropertiesPanel
            selectedNode={selectedNodeLive}
            selectedEdge={selectedEdgeLive}
            onDeleteNode={(id) => canvasRef.current?.deleteNode(id)}
            onDeleteEdge={(id) => canvasRef.current?.deleteEdge(id)}
            onFlowRateChange={(id, value) => canvasRef.current?.setFlowRate(id, value)}
          />
          <BalanceReport result={balanceResult} />
        </div>
      </div>
    </div>
  );
}
