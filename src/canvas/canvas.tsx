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
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  ConnectionMode,
  useReactFlow,
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

function CircuitCanvasInner() {
  const nodes         = useAppStore((s) => s.nodes);
  const edges         = useAppStore((s) => s.edges);
  const onNodesChange = useAppStore((s) => s.onNodesChange);
  const onEdgesChange = useAppStore((s) => s.onEdgesChange);
  const onConnect     = useAppStore((s) => s.onConnect);
  const insertComponentOnEdge = useAppStore((s) => s.insertComponentOnEdge);
  const addComponent    = useAppStore((s) => s.addComponent);
  const paletteDropMode = useAppStore((s) => s.paletteDropMode);
  const { screenToFlowPosition } = useReactFlow();

  const handleConnect = useCallback(onConnect, [onConnect]);

  // Palette drop handling. dragover must preventDefault or the browser
  // refuses the drop; the payload itself is only readable in the drop event,
  // so dragover checks the type list.
  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes(PALETTE_DND_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  // Drop behavior is lesson-scoped (store.paletteDropMode):
  //   insert — the drop must land on a wire; the wire splits and the
  //            component is interposed in series (lessons 2 and 4). React
  //            Flow renders each edge (including its wide invisible
  //            interaction path) inside a .react-flow__edge group carrying
  //            data-id, so the element under the cursor resolves the target
  //            wire. Off-wire drops are a no-op.
  //   place  — the component is created free and unwired at the drop
  //            position; the user draws its wires by hand (lesson 5).
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      const raw = event.dataTransfer.getData(PALETTE_DND_MIME);
      if (!raw) return;
      event.preventDefault();

      if (paletteDropMode === 'place') {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        addComponent(JSON.parse(raw), position);
        return;
      }

      const edgeEl = (event.target as Element).closest?.('.react-flow__edge');
      const edgeId = edgeEl?.getAttribute('data-id');
      if (!edgeId) return;

      insertComponentOnEdge(edgeId, JSON.parse(raw));
    },
    [paletteDropMode, screenToFlowPosition, addComponent, insertComponentOnEdge],
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

/** React Flow host — provider wrapper so the inner canvas can use flow APIs. */
export function CircuitCanvas() {
  return (
    <ReactFlowProvider>
      <CircuitCanvasInner />
    </ReactFlowProvider>
  );
}
