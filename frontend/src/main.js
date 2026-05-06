import { Circuit } from "./circuit.js";
import { renderCircuit, renderPalette } from "./render.js";
import { attachDragDrop } from "./dragdrop.js";
import { renderProbabilities } from "./display.js";
import { simulate } from "./api.js";

const NUM_WIRES = 4;
const NUM_COLS = 12;
const DEBOUNCE_MS = 50;

const paletteEl = document.getElementById("palette");
const gridEl = document.getElementById("grid");
const displayEl = document.getElementById("display");

const circuit = new Circuit(NUM_WIRES, NUM_COLS);
let pendingTimer = null;
let inflight = null;

renderPalette(paletteEl);
renderCircuit(circuit, gridEl);

attachDragDrop({
  paletteEl,
  gridEl,
  onChange: (mutate) => {
    mutate(circuit);
    renderCircuit(circuit, gridEl);
    scheduleSimulation();
  },
});

scheduleSimulation();

function scheduleSimulation() {
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(runSimulation, DEBOUNCE_MS);
}

async function runSimulation() {
  if (inflight) inflight.abort();
  const controller = new AbortController();
  inflight = controller;
  try {
    const result = await simulate(circuit.toJSON(), controller.signal);
    if (controller.signal.aborted) return;
    renderProbabilities(result.num_wires, result.probabilities, displayEl);
  } catch (err) {
    if (err.name === "AbortError") return;
    console.error("simulate failed:", err);
  } finally {
    if (inflight === controller) inflight = null;
  }
}
