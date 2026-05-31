# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CircuitLingo (Duolingo for Circuits)

Browser-based interactive circuit simulator for beginners who find tools like CircuitLab and Falstad intimidating. Colorful drag-and-drop canvas with guided lessons that introduce one concept at a time. Live V/I/R values update as the user wires — the state of the circuit IS the answer; no submit button anywhere. Portfolio project, intentionally tight scope.

## Tech stack

- Vite + React + TypeScript
- React Flow (@xyflow/react, v12+) for the canvas (nodes = components, edges = wires)
- Zustand for app state (circuit layout, lesson progress, sandbox flag)
- TailwindCSS for styling
- Custom algebraic solver — series/parallel reduction + Ohm's law only
- `localStorage` for persistence
- No backend, ever. Static deploy to Vercel / Netlify / GitHub Pages.

## Scope & guardrails

This is a **portfolio project**, not a production teaching platform. Scope decisions should reflect that.

### Curriculum scope (5 core + 2 bonus)

Core lessons (ship these):

1. **The complete loop** — battery + LED pre-placed, 3 of 4 wires drawn; user drags the final wire to close the circuit. LED transitions from `isolated-from-source` to `active`. New primitive: drag-to-wire.
2. **The resistor as gatekeeper** — LED showing "too bright" state; user drops a pre-supplied 330Ω resistor onto the wire to insert it in series. New primitive: insert component onto existing wire.
3. **Ohm's law** — slider sweeps resistance from 100Ω–1kΩ; live V/I/R panel updates. Advancement requires exploring both ends of the range. New primitive: component-value slider.
4. **Series resistors** — user inserts a second resistor; total R = R₁ + R₂, per-component voltages visible for the first time. No new primitive.
5. **Parallel resistors** — user wires a second resistor across the same two nodes (branching rather than inserting). New primitive: wire to existing node.

Bonus lessons (defer; ship only if core is polished):

6. **Voltage divider** — two series resistors, voltmeter probes the midpoint, sliders show ratio control.
7. **The switch** — series switch, toggle open/closed, observe circuit break and restore.

Sandbox mode unlocks after Lesson 5: no goal, full palette, free play.

Full per-lesson canvas states, hint copy, and advancement conditions live in `docs/lesson-plan.md`. Reference it when implementing lesson definitions — don't restate that detail here.

If a lesson concept would require math beyond series/parallel reduction + Ohm's law, it's out of scope. Specifically out: nodal analysis, mesh analysis, matrix-based solvers, multi-loop circuits that can't be reduced, AC/transient/frequency-domain analysis.

### Design principles

- **One new primitive per lesson.** Each core lesson introduces at most one new interaction. Adding two at once means the lesson should split.
- **No submit button, ever.** `SolveResult` updates live as the user wires and edits. Goal match triggers auto-advance; failure states drive hint text. The state of the circuit IS the answer.
- **Three ComponentStates drive failure hints:** `dangling` (terminal not wired), `isolated-from-source` (wired but no path to a battery), `active` (in a complete loop). These are the only signals lessons branch on for feedback.
- **Validators are factories**, never hand-rolled per lesson — e.g. `expectVoltageAcross('r1', 6)`, `expectComponentLit('led1')`. Lessons compose them; we don't write bespoke check logic per lesson.
- **Lessons reference component-terminal pairs**, never raw node IDs. Node IDs are an internal implementation detail of the solver.
- **Colorful and beginner-friendly over hyper-realistic.** UI components should look inviting, not like schematic symbols out of a textbook.

### Frontend-only — no backend, ever

- Persistence is `localStorage`. Period.
- No accounts, no auth, no server-side validation, no analytics, no leaderboards, no cross-device sync.
- Lesson content lives as static TypeScript/JSON imports — no fetch from an API, no CMS.
- If a feature would require a backend, it's deferred. The portfolio version ships browser-only and deploys as a static site.

### What "done" looks like

- Five core lessons auto-advancing on goal match, with targeted hints on `dangling` / `isolated-from-source` states
- Clean drag-and-drop canvas with live-updating V/I/R values
- Sandbox mode unlocked after Lesson 5
- Deployed to a free static host (Vercel, Netlify, or GitHub Pages)
- Bonus lessons 6 and 7 are stretch — ship only if core feels polished

### Anti-scope (explicitly out)

- More than 7 total lessons in the portfolio version
- Any algorithm requiring matrix math (MNA, mesh currents, admittance matrices)
- Multiplayer, shared sessions, classroom tools
- Account systems, progress sync, teacher dashboards
- Native mobile apps (responsive web is fine)
- AC analysis, transient simulation, op-amps, frequency response
- Schematic export, PCB design, professional EE tooling

If a prompt or suggestion would push past these guardrails, push back or simplify rather than building it.

## Locked architectural decisions

- `Component` is a discriminated union keyed by `kind`: `'battery' | 'resistor' | 'bulb' | 'switch'`.
- Every component has a uniform `terminals` object. Resistors/bulbs/switches use `{ a, b }`; batteries use `{ positive, negative }` — polarity is type-level meaningful. `Object.values(c.terminals)` returns both terminal node IDs regardless of kind.
- Nodes are implicit. Terminals reference shared `NodeId` strings. No separate node list — nodes are derived from terminal references.
- Wires live only in React Flow, not in the `Circuit` domain model. The React Flow → `Circuit` converter does union-find over wires to merge connected terminals into shared node IDs.
- `ComponentState` is a discriminated union. No top-level `isClosed` boolean — derive it from per-component states (any `active` → circuit is closed).
- Lessons reference `TerminalRef` (component-terminal pairs), never raw node IDs. Node IDs are ephemeral solver implementation details and may regenerate between solves.

## Type contracts (pinned)

```typescript
type TerminalRef = {
  componentId: string;
  terminal: 'a' | 'b' | 'positive' | 'negative';
};

type ComponentState =
  | { status: 'floating'; reason: 'dangling' | 'isolated-from-source' }
  | { status: 'active'; voltage: number; current: number; power: number };

interface SolveResult {
  components: Record<string, ComponentState>;
  nodes: Record<string, number>;
}
```

These shapes are stable. The UI codes against them in Phase 1 (mock solver) and Phase 2 (real solver) without change.

`SolveResult.nodes` is `Record<string, number>` — a plain voltage (V relative to ground, ground = 0) per NodeId, populated by `ohms.ts` in Phase 2, empty in Phase 1. This is sufficient for Lesson 6's voltmeter: the midpoint reading is a single lookup `nodes[probeNodeId]`. A two-probe differential measurement between two non-ground nodes is also fine — two lookups from the same map. No widening of this type is needed for any lesson in scope.

App-level state (the Zustand stores) holds React Flow `nodes` and `edges`, the current lesson id, sandbox flag, and lesson progress. It is *not* the same as the `Circuit` domain model — the converter bridges the two.

## Domain split — Claude (UI) vs Codex (algorithms)

**Claude owns:** React Flow integration, component styling (Tailwind), Zustand stores, lesson player, palette, value-readout panel, persistence, app shell, the `solver/index.ts` adapter, mock fixtures, every TypeScript type, and all lesson definitions.

**Codex owns** (pure-math / graph algorithms):
- `canvas/converter.ts` — union-find over React Flow edges to merge terminals into shared `NodeId`s
- `solver/topology.ts` — DFS reachability for `dangling` / `isolated-from-source` classification
- `solver/ohms.ts` — Phase 2 series/parallel reduction solver

**`solve()` signature:** `solver/index.ts` exports `solve(rfNodes: AppNode[], rfEdges: Edge[]): SolveResult`. In Phase 1 it calls `reachability.ts` directly. In Phase 2 it will call `convertToCircuit()` internally — `Circuit` is never visible at the call site in the store. Whether to refactor the public signature to `solve(circuit: Circuit)` and push the conversion into the store is a **pending Phase 2 decision**; do not resolve it unilaterally.

**The rule:** When Claude reaches a Codex-owned file, Claude writes a strict TypeScript stub — exported function signature(s), input/output types, JSDoc describing behavior and edge cases — and stops. Do not attempt internal math or graph logic. The stub is the contract Codex implements against; the implementation comes back wholesale.

## Folder structure

```
src/
  domain/
    component.ts       — Component discriminated union, terminals shape
    node.ts            — NodeId, TerminalRef
    circuit.ts         — Circuit (the converter's output type)
    solve-result.ts    — SolveResult + ComponentState
  solver/
    index.ts           — solve(rfNodes, rfEdges): SolveResult — adapter; Phase 1 calls reachability + fixture match, Phase 2 calls converter + topology + ohms
    mock-fixtures.ts   — hardcoded results shape-matched against the circuit graph (not keyed by lesson), Phase 1 only
    reachability.ts    — Phase 1 only, throwaway; DFS reachability on React Flow graph to classify isolated-from-source; deleted when Codex delivers topology.ts in Phase 2
    topology.ts        — Codex; Phase 2 reachability on Circuit (union-find node IDs); replaces reachability.ts
    ohms.ts            — Codex; Phase 2 series/parallel reduction
  canvas/
    canvas.tsx         — React Flow host
    converter.ts       — Codex; React Flow graph → Circuit via union-find
    nodes/             — custom node renderer per kind
      battery-node.tsx
      resistor-node.tsx
      bulb-node.tsx
    edges/
      wire-edge.tsx
  palette/
    palette.tsx        — tray; reads available kinds from current lesson
  panel/
    value-readout.tsx
  lessons/
    player.tsx         — drives lesson state, listens to circuit + solve result
    validators.ts      — expectConnected, expectComponentLit, expectVoltageAcross, …
    definitions/       — one file per lesson; data, not logic
      lesson-01-complete-loop.ts
      lesson-02-resistor.ts
      lesson-03-ohms-law.ts
      lesson-04-series.ts
      lesson-05-parallel.ts
  state/               — Zustand store(s): circuit state, lesson state, sandbox flag
  persistence/
    storage.ts         — localStorage adapter; lesson progress only
  app/
    app.tsx            — shell, layout
    main.tsx           — entry
```

Bonus content (switch component, voltmeter component, lessons 6 and 7) slots into existing locations when actually built. Do not pre-create directories or stubs for them.

## Solve cadence

- Solve on React Flow connect/disconnect events.
- Live-solve on slider drag (Lesson 3 depends on real-time value updates).
- Do not solve while a wire is being dragged but not yet connected — that's physically an open circuit, and the render cycles aren't worth spending.

## Working agreement

- **Prose before TypeScript** for non-trivial logic. Walk through algorithms or component interactions in English or pseudocode first; the design gets reviewed before code lands.
- **Validators are factories**, never hand-rolled per lesson. Lessons compose them from `expectVoltageAcross`, `expectComponentLit`, `expectConnected`, etc.
- **Ask 3–5 questions before drafting big designs.** Collaborative design, not hand-offs.
- **Don't pre-build for deferred features.** Switch, voltmeter, bonus lessons — refactor when they actually land.
- **Push back if a request breaks the guardrails.** Point it out rather than silently building it.
- **Sentence case in UI copy and code comments.** No Title Case headings inside the app.
- **When you hit a Codex-owned file, stub and stop.** Don't implement.

## Phase plan

**Status:** Phase 1 complete and verified end-to-end. Lesson 1 drag confirmed in-browser; `store.onConnect → solve() → SolveResult` data flow fully traced. Phase 2 not started.

- **Phase 1 — UI scaffold + mocked solver.** React Flow canvas, palette, lesson player, value-readout panel, Zustand stores, Lesson 1 working end-to-end against a mock. Fully Claude-owned — no Codex round-trip needed. `solver/reachability.ts` (throwaway DFS, works on React Flow graph directly) classifies `isolated-from-source`; `solver/mock-fixtures.ts` shape-matches the React Flow graph to return hardcoded V/I/R values. `solver/index.ts` composes both. Codex stubs (`canvas/converter.ts`, `solver/topology.ts`, `solver/ohms.ts`) are written with full JSDoc but not called until Phase 2.
- **Phase 2 — Real solver.** Codex implements `canvas/converter.ts` (union-find), `solver/topology.ts` (reachability), and `solver/ohms.ts` (series/parallel reduction). `solver/index.ts` wires all three together internally. UI doesn't change — the type signature is the contract.
- **Phase 3 — Lesson content, polish, deploy.** Remaining lesson definitions, hint copy, advancement validators, animations, sandbox unlock. Deploy to a free static host.

  Parked choices to revisit in Phase 3:
  - **Auto-advance delay:** 1.8 s hardcoded — tune after real playtesting.
  - **LED active color:** amber (`bg-amber-400`) — verify contrast and legibility on varied backgrounds.
  - **LED renderer:** 💡 emoji placeholder — replace with an SVG symbol before ship.
  - **"No resistor" current:** 500 mA in `batteryPlusBulb` fixture — should read as conspicuously dangerous but not implausible; pick a final value after seeing it in context.
