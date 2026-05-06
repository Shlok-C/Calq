import { GATES, GATE_ORDER } from "./gates.js";

export function renderPalette(rootEl) {
  rootEl.innerHTML = "";
  for (const id of GATE_ORDER) {
    const g = GATES[id];
    const tile = document.createElement("div");
    tile.className = `palette-gate gate-${id}`;
    tile.dataset.gateId = id;
    tile.dataset.name = g.name ?? id;
    tile.draggable = true;
    tile.textContent = g.label;
    rootEl.appendChild(tile);
  }
}

export function renderCircuit(circuit, rootEl) {
  rootEl.innerHTML = "";
  rootEl.style.setProperty("--cols", circuit.numCols);
  rootEl.style.setProperty("--wires", circuit.numWires);

  const colInfo = circuit.cells.map(analyzeColumn);

  for (let wire = 0; wire < circuit.numWires; wire++) {
    for (let col = 0; col < circuit.numCols; col++) {
      const gateId = circuit.getCell(col, wire);
      const info = colInfo[col];
      const g = GATES[gateId];

      const isCnotTarget =
        gateId === "X" && info.targetWire === wire && info.controls.length > 0;

      const cell = document.createElement("div");
      cell.className = `cell gate-${gateId} kind-${g.kind}`;
      if (isCnotTarget) cell.classList.add("cnot-target");

      if (info.minWire !== null && wire >= info.minWire && wire <= info.maxWire) {
        if (wire > info.minWire) cell.classList.add("connect-top");
        if (wire < info.maxWire) cell.classList.add("connect-bottom");
      }

      cell.dataset.col = col;
      cell.dataset.wire = wire;
      cell.draggable = gateId !== "I";
      cell.textContent = isCnotTarget ? "⊕" : gateId === "I" ? "" : g.label;

      rootEl.appendChild(cell);
    }
  }
}

function analyzeColumn(col) {
  const controls = [];
  let targetWire = null;
  let targetGate = null;
  for (let wire = 0; wire < col.length; wire++) {
    const id = col[wire];
    if (id === "CTRL") controls.push(wire);
    else if (id !== "I") {
      targetWire = wire;
      targetGate = id;
    }
  }
  let minWire = null;
  let maxWire = null;
  if (controls.length > 0 && targetWire !== null) {
    const all = [...controls, targetWire];
    minWire = Math.min(...all);
    maxWire = Math.max(...all);
  }
  return { controls, targetWire, targetGate, minWire, maxWire };
}
