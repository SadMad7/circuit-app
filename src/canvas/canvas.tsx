/**
 * React Flow host — the interactive circuit canvas.
 *
 * Connects React Flow events to the Zustand store:
 *   onConnect      → store.onConnect (adds edge, triggers solve)
 *   onEdgesChange  → store.onEdgesChange (handles deletions, triggers solve)
 *   onNodesChange  → store.onNodesChange (drag positions — no solve; topology unchanged)
 *
 * Solve cadence (per CLAUDE.md):
 *   • On connect / disconnect events ✓
 *   • NOT during mid-drag (wire not yet connected)
 *   • Live on slider drag (Lesson 3) — handled separately via store.triggerSolve()
 */

import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  ConnectionMode,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAppStore } from '../state/store';
import { PALETTE_DND_MIME } from '../palette/palette';
import { BatteryNode } from './nodes/battery-node';
import { BulbNode } from './nodes/bulb-node';
import { ResistorNode } from './nodes/resistor-node';
import { WireEdge } from './edges/wire-edge';

// Register custom component renderers
const nodeTypes: NodeTypes = {
  battery:  BatteryNode as React.ComponentType<any>,
  bulb:     BulbNode    as React.ComponentType<any>,
  resistor: ResistorNode as React.ComponentType<any>,
};

const edgeTypes: EdgeTypes = {
  wire: WireEdge as React.ComponentType<any>,
};

export function CircuitCanvas() {
  const nodes         = useAppStore((s) => s.nodes);
  const edges         = useAppStore((s) => s.edges);
  const onNodesChange = useAppStore((s) => s.onNodesChange);
  const onEdgesChange = useAppStore((s) => s.onEdgesChange);
  const onConnect     = useAppStore((s) => s.onConnect);
  const insertComponentOnEdge = useAppStore((s) => s.insertComponentOnEdge);

  const handleConnect = useCallback(onConnect, [onConnect]);

  // Palette drop-to-insert. dragover must preventDefault or the browser
  // refuses the drop; the payload itself is only readable in the drop event,
  // so dragover checks the type list.
  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes(PALETTE_DND_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  // React Flow renders each edge (including its wide invisible interaction
  // path) inside a .react-flow__edge group carrying data-id, so the element
  // under the drop cursor resolves the target wire directly. Off-wire drops
  // are a no-op — the chip snaps back, nothing is inserted.
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      const raw = event.dataTransfer.getData(PALETTE_DND_MIME);
      if (!raw) return;
      event.preventDefault();

      const edgeEl = (event.target as Element).closest?.('.react-flow__edge');
      const edgeId = edgeEl?.getAttribute('data-id');
      if (!edgeId) return;

      insertComponentOnEdge(edgeId, JSON.parse(raw));
    },
    [insertComponentOnEdge],
  );

  return (
    <div
      className="w-full h-full rounded-xl overflow-hidden bg-white border border-slate-200 shadow-inner"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.5}
        maxZoom={2}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#e2e8f0"
        />
        <Controls
          showInteractive={false}
          className="!shadow-none !border !border-slate-200 !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
