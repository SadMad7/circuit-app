const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;

Module._resolveFilename = function resolveTsFile(request, parent, isMain, options) {
  if ((request.startsWith('./') || request.startsWith('../')) && parent?.filename) {
    const candidate = path.resolve(path.dirname(parent.filename), request);
    if (!path.extname(candidate) && fs.existsSync(`${candidate}.ts`)) {
      return `${candidate}.ts`;
    }
  }

  return originalResolve.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = function compileTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;

  module._compile(output, filename);
};

const { convertToCircuit } = require(path.join(root, 'src/canvas/converter.ts'));
const { solve } = require(path.join(root, 'src/solver/index.ts'));
const { classifyTopology } = require(path.join(root, 'src/solver/topology.ts'));

function approx(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Number.isFinite(actual),
    `Expected ${actual} to be finite before comparing with ${expected}`,
  );
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be approximately ${expected}`,
  );
}

function active(result, componentId) {
  const state = result.components[componentId];
  assert.equal(state?.status, 'active', `${componentId} should be active`);
  return state;
}

function floating(result, componentId, reason) {
  const state = result.components[componentId];
  assert.equal(state?.status, 'floating', `${componentId} should be floating`);
  assert.equal(state.reason, reason, `${componentId} should be ${reason}`);
  return state;
}

function battery(id = 'battery-1') {
  return {
    id,
    type: 'battery',
    position: { x: 0, y: 0 },
    data: {
      kind: 'battery',
      componentId: id,
      label: '9V battery',
      voltageV: 9,
    },
  };
}

function bulb(id = 'led-1') {
  return {
    id,
    type: 'bulb',
    position: { x: 0, y: 0 },
    data: {
      kind: 'bulb',
      componentId: id,
      label: 'LED',
      resistanceOhm: 18,
    },
  };
}

function resistor(id, resistanceOhm) {
  return {
    id,
    type: 'resistor',
    position: { x: 0, y: 0 },
    data: {
      kind: 'resistor',
      componentId: id,
      label: id,
      resistanceOhm,
    },
  };
}

function edge(id, source, sourceTerminal, target, targetTerminal) {
  return {
    id,
    source,
    sourceHandle: `${source}__${sourceTerminal}`,
    target,
    targetHandle: `${target}__${targetTerminal}`,
    type: 'wire',
  };
}

function testLesson1Anchor() {
  const nodes = [battery(), bulb()];
  const openEdges = [
    edge('e1', 'led-1', 'b', 'battery-1', 'negative'),
  ];
  const closedEdges = [
    ...openEdges,
    edge('e2', 'battery-1', 'positive', 'led-1', 'a'),
  ];

  const open = solve(nodes, openEdges);
  floating(open, 'battery-1', 'dangling');
  floating(open, 'led-1', 'dangling');

  const closed = solve(nodes, closedEdges);
  const led = active(closed, 'led-1');
  active(closed, 'battery-1');

  approx(led.voltage, 9);
  approx(led.current, 0.5);
  approx(led.power, 4.5);
}

function testSeriesAndParallelValues() {
  const b = battery();
  const led = bulb();
  const r1 = resistor('r1', 330);

  const series = solve([b, r1, led], [
    edge('e1', 'battery-1', 'positive', 'r1', 'a'),
    edge('e2', 'r1', 'b', 'led-1', 'a'),
    edge('e3', 'led-1', 'b', 'battery-1', 'negative'),
  ]);

  const seriesCurrent = 9 / 348;
  approx(active(series, 'r1').current, seriesCurrent);
  approx(active(series, 'r1').voltage, seriesCurrent * 330);
  approx(active(series, 'led-1').voltage, seriesCurrent * 18);

  const pr1 = resistor('pr1', 1000);
  const pr2 = resistor('pr2', 1000);
  const parallel = solve([b, pr1, pr2], [
    edge('e1', 'battery-1', 'positive', 'pr1', 'a'),
    edge('e2', 'pr1', 'b', 'battery-1', 'negative'),
    edge('e3', 'battery-1', 'positive', 'pr2', 'a'),
    edge('e4', 'pr2', 'b', 'battery-1', 'negative'),
  ]);

  approx(active(parallel, 'pr1').current, 0.009);
  approx(active(parallel, 'pr2').current, 0.009);
  approx(active(parallel, 'battery-1').current, 0.018);
}

function testConverterDeterminism() {
  const nodes = [battery(), resistor('r1', 330), bulb()];
  const edges = [
    edge('e1', 'battery-1', 'positive', 'r1', 'a'),
    edge('e2', 'r1', 'b', 'led-1', 'a'),
    edge('e3', 'led-1', 'b', 'battery-1', 'negative'),
  ];

  assert.deepEqual(
    convertToCircuit(nodes, edges),
    convertToCircuit(nodes, edges),
    'converter output should be deterministic, including generated NodeIds',
  );
}

function testZeroBatteryTopology() {
  const circuit = convertToCircuit([resistor('r1', 330), bulb()], [
    edge('e1', 'r1', 'a', 'led-1', 'a'),
    edge('e2', 'r1', 'b', 'led-1', 'b'),
  ]);
  const topology = classifyTopology(circuit);

  assert.equal(topology.r1.status, 'floating');
  assert.equal(topology.r1.reason, 'isolated-from-source');
  assert.equal(topology['led-1'].status, 'floating');
  assert.equal(topology['led-1'].reason, 'isolated-from-source');
}

function testBypassedComponentZeroValues() {
  const b = battery();
  const r1 = resistor('r1', 100);
  const bypassed = resistor('r2', 330);
  const r3 = resistor('r3', 200);
  const result = solve([b, r1, bypassed, r3], [
    edge('e1', 'battery-1', 'positive', 'r1', 'a'),
    edge('e2', 'r1', 'b', 'r2', 'a'),
    edge('e3', 'r2', 'b', 'r1', 'b'),
    edge('e4', 'r2', 'b', 'r3', 'a'),
    edge('e5', 'r3', 'b', 'battery-1', 'negative'),
  ]);
  const state = active(result, 'r2');

  approx(state.voltage, 0);
  approx(state.current, 0);
  approx(state.power, 0);
}

function testBatteryShortFlattensToUnsolvable() {
  const result = solve([battery()], [
    edge('e1', 'battery-1', 'positive', 'battery-1', 'negative'),
  ]);

  floating(result, 'battery-1', 'unsolvable');
}

testLesson1Anchor();
testSeriesAndParallelValues();
testConverterDeterminism();
testZeroBatteryTopology();
testBypassedComponentZeroValues();
testBatteryShortFlattensToUnsolvable();

console.log('solver regression passed');
