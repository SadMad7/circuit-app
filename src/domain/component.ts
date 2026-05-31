/** The four component kinds that exist in the domain. */
export type ComponentKind = 'battery' | 'resistor' | 'bulb' | 'switch';

/**
 * Battery terminals — polarity is type-level meaningful.
 * `Object.values(battery.terminals)` returns both NodeIds.
 */
export type BatteryTerminals = { positive: string; negative: string };

/** Two-terminal components share this shape (a = first leg, b = second leg). */
export type TwoTerminals = { a: string; b: string };

export type Battery = {
  kind: 'battery';
  id: string;
  voltageV: number;
  terminals: BatteryTerminals;
};

export type Resistor = {
  kind: 'resistor';
  id: string;
  resistanceOhm: number;
  terminals: TwoTerminals;
};

/**
 * `bulb` is the domain name for what the UI calls "LED."
 * Current is governed by surrounding resistors via V=IR — no diode curve.
 */
export type Bulb = {
  kind: 'bulb';
  id: string;
  terminals: TwoTerminals;
};

/** Bonus lesson 7 component — deferred; stub type included so the union is complete. */
export type Switch = {
  kind: 'switch';
  id: string;
  closed: boolean;
  terminals: TwoTerminals;
};

export type Component = Battery | Resistor | Bulb | Switch;
