"use client";

import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CIRCUIT_NODE_TYPES } from "@/components/circuits/circuit-node";
import { WIRE_STYLE } from "@/lib/circuits/component-defaults";

export function CircuitViewer({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  return (
    <div className="h-[65vh] min-h-[420px] overflow-hidden rounded-lg border-2 border-line/80 bg-[#0a0f18] lg:h-[calc(100vh-320px)]">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={CIRCUIT_NODE_TYPES}
          defaultEdgeOptions={WIRE_STYLE}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          elementsSelectable={false}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Lines} gap={20} color="rgba(255,255,255,0.045)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
