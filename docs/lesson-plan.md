# Circuit Teaching App — Lesson Plan

## Overview

5 core lessons + 2 bonus lessons + sandbox mode. Designed for complete beginners (high school level and up). Tone: Duolingo — encouraging, immediate feedback, no jargon walls.

**Solver ceiling:** Series/parallel reduction + Ohm's law only. No nodal or mesh analysis. Lessons are intentionally designed within this constraint.

**Progression tiers:**
- **Rails** (Lessons 1–2): Components pre-placed, one action required. Hints on every wrong path.
- **Assisted** (Lessons 3–5): Limited palette, starter pieces provided, user builds toward a goal.
- **Bonus** (Lessons 6–7): Introduced after core curriculum, slightly more open-ended.
- **Sandbox**: Unlocks after Lesson 5. Full palette, no goal, free exploration.

---

## Core Lessons

### Lesson 1 — The Complete Loop
**Concept:** A circuit needs an unbroken path. Without it, nothing happens.

**Canvas at start:** Battery (left) and LED (right) pre-placed. Three of four wire connections already drawn — only the battery (+) → LED anode connection is missing. LED is gray/unlit. Live values panel visible but blank.

**Initial hint:** *"The LED wants to light up, but the path isn't complete. Drag a wire from the battery's + terminal to the LED's longer leg."*

**Wrong path hint:** If user wires + to cathode — *"Almost — that leg is the cathode, the exit point. Try the other leg."*

**User action:** Drags one wire to close the loop.

**Advancement trigger:** All components transition to `active`. LED lights up. Live panel populates (current reads conspicuously high — seeds the next lesson).

**New primitive:** Drag-to-wire between terminals.

---

### Lesson 2 — The Resistor as a Gatekeeper
**Concept:** Resistors limit current. Every LED circuit needs one or the LED burns out.

**Canvas at start:** Completed circuit from Lesson 1 (battery + LED, fully wired, glowing). LED rendered with a "too bright" visual treatment + ⚠ icon next to current reading. One 330Ω resistor available in the component tray. Palette otherwise locked.

**Initial hint:** *"That LED is getting way too much current — it would burn out in seconds. Drag the resistor onto the wire to slow things down."*

**User action:** Drags resistor from tray and drops it onto the wire, inserting it in series.

**Advancement trigger:** Resistor is `active` in series; current reading drops into safe range; ⚠ icon clears.

**New primitive:** Series insertion — dropping a component onto an existing wire.

---

### Lesson 3 — Ohm's Law
**Concept:** V = IR. Voltage, current, and resistance are locked together. Change one, the others respond instantly.

**Canvas at start:** Battery + resistor + LED, fully wired and active. Live panel shows voltage across resistor, current, and resistance. Slider on the resistor controls its value (100Ω–1kΩ). Equation "V = I × R" displayed as a canvas annotation.

**Initial hint:** *"Drag the slider to change the resistor's value. Watch what happens to the current."*

**Contextual hints:**
- Slider at max: *"More resistance, less current. The LED gets dimmer."*
- Slider at min: *"Less resistance, more current. Brighter — but don't go too low."*

**User action:** Moves slider to a high-resistance position and a low-resistance position within the same session.

**Advancement trigger:** Slider has traveled to both ends of its range, demonstrating intentional exploration in both directions.

**New primitive:** Component value slider (live resistance adjustment).

---

### Lesson 4 — Series Resistors
**Concept:** Resistors in series add up. R_total = R1 + R2. Current is the same everywhere in a series loop.

**Canvas at start:** Battery + one 330Ω resistor + LED, fully wired and active. Live panel shows per-component voltage readings for the first time. A 470Ω resistor sits in the tray.

**Initial hint:** *"You've got one resistor. What happens if you add another one in the same line? Drop the second resistor onto the wire."*

**Post-placement hint:** *"Notice the current — it's the same at every point in the loop. Series circuits share current."*

**User action:** Drops second resistor onto the wire in series. Total resistance jumps to 800Ω; current drops.

**Advancement trigger:** Both resistors `active` in series + 3-second dwell on updated values.

**New primitive:** None — same series insertion as Lesson 2, now applied intentionally with two components.

---

### Lesson 5 — Parallel Resistors
**Concept:** Resistors in parallel give current more paths. Total resistance drops. Voltage across parallel branches is the same.

**Canvas at start:** Battery + one 1kΩ resistor wired across it (no LED — keeps the topology clean). Live panel: 9V, 9mA. A second 1kΩ resistor in the tray. The existing resistor's two terminal nodes are visually afforded as branch points.

**Initial hint:** *"This time, instead of adding to the line, connect the new resistor across the same two points — a parallel branch."*

**Wrong path hint (user tries series insertion):** *"That puts them in series — same lane. Try connecting this one across the same two terminals as the first resistor."*

**Post-placement hint:** *"Two paths means more current can flow — total resistance went down, not up. That's the key difference from series."*

**User action:** Wires second resistor between the same two nodes as the first, creating a parallel branch. Total resistance → 500Ω, current → 18mA, voltage stays 9V.

**Advancement trigger:** Second resistor `active` in parallel configuration.

**New primitive:** Branch wiring — connecting to an existing node rather than inserting onto a wire. This is a distinct gesture from series insertion and requires explicit UI affordance.

---

## Bonus Lessons

### Lesson 6 — Voltage Divider
**Concept:** Two series resistors split the supply voltage proportionally. The midpoint voltage depends on the ratio of R1 to R2.

**Canvas at start:** Battery + two resistors in series (330Ω and 670Ω), pre-placed and wired. Midpoint node visually highlighted. Voltmeter probe in the tray.

**Initial hint:** *"The two resistors share the 9V — but not equally. Drop the voltmeter on the wire between them to see how it's split."*

**User action:** Places voltmeter with one probe at the midpoint, one at ground. Live panel adds midpoint voltage (~6V). Sliders on both resistors unlock — adjusting either shifts the midpoint voltage in real time.

**Advancement trigger:** Voltmeter correctly placed and reads a value; user adjusts one slider and observes midpoint voltage shift.

**New primitive:** Voltmeter placement (two-terminal measurement across a node, not in the current path).

---

### Lesson 7 — The Switch
**Concept:** A switch is an intentional break. Closed = current flows. Open = circuit is broken.

**Canvas at start:** Battery + resistor + LED, fully wired and glowing. Switch in the tray.

**Initial hint:** *"What if you wanted to turn this off without unplugging the battery? That's what a switch does. Add it to the circuit."*

**Post-placement:** Switch defaults to closed, circuit stays active. Hint: *"Now try toggling it."*

**Toggle open:** LED goes dark, components go `isolated-from-source`. *"Open switch, broken path — same as a missing wire."*

**Toggle closed:** LED lights. *"Closed switch, complete path. You're in control."*

**Advancement trigger:** User toggles the switch in both directions at least once.

**New primitive:** Toggle click — switch state change (not a drag or wire action).

---

## Sandbox Mode

Unlocks after Lesson 5 (or Lesson 7 if bonus lessons are completed). Full component palette. No goal, no validators, no hints. Free exploration.

Consider surfacing the live values panel prominently in sandbox — it's the payoff for everything the learner built up to.

---

## Design Constraints & Notes

- **No submit button.** SolveResult updates live. Goal match triggers auto-advance.
- **ComponentStates** drive all hint logic: `dangling` (terminal unwired), `isolated-from-source` (wired but no battery path), `active` (current flowing).
- **Validators are factories** — `expectVoltageAcross(...)`, `expectComponentLit(...)` etc. Lessons compose them, never hand-roll checks.
- **Lessons reference component-terminal pairs**, never raw node IDs.
- Lesson 5's parallel wiring is the hardest UI problem in the core curriculum. Over-invest in the branch-node affordance.
- Lesson 3's slider is the first live solver dependency on a *value* (not just topology). Spike this interaction early.
