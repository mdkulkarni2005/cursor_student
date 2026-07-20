"use client";

import { useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import { CircuitViewer } from "@/components/fault-finder/circuit-viewer";
import { MultimeterPanel, type ProbeLogEntry } from "@/components/fault-finder/multimeter-panel";
import { DiagnosisForm } from "@/components/fault-finder/diagnosis-form";
import type { CircuitNode as PersistedNode } from "@/lib/circuits/types";
import type { CircuitNodeData } from "@/components/circuits/circuit-node";

export function FaultFinderWorkspace({ slug, components, initialNodes, edges }: { slug: string; components: PersistedNode[]; initialNodes: Node[]; edges: Edge[] }) {
  const [log, setLog] = useState<ProbeLogEntry[]>([]);
  const [probingId, setProbingId] = useState<string | null>(null);

  async function handleProbe(componentId: string, label: string) {
    setProbingId(componentId);
    try {
      const res = await fetch("/api/fault-finder/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, componentId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setLog((prev) => [{ componentId, label, reading: data.reading }, ...prev]);
    } finally {
      setProbingId(null);
    }
  }

  const nodes: Node[] = initialNodes.map((n) => {
    const d = n.data as unknown as CircuitNodeData;
    return {
      ...n,
      data: {
        ...d,
        readOnly: true,
        probing: probingId === n.id,
        onProbe: () => handleProbe(n.id, d.label),
      } satisfies CircuitNodeData,
    };
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <CircuitViewer nodes={nodes} edges={edges} />
      <div className="flex flex-col gap-4">
        <MultimeterPanel log={log} />
        <DiagnosisForm slug={slug} components={components} />
      </div>
    </div>
  );
}
