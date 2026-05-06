const SOURCE_PALETTE = "palette";
const SOURCE_CELL = "cell";

export function attachDragDrop({ paletteEl, gridEl, onChange }) {
  paletteEl.addEventListener("dragstart", (e) => {
    const tile = e.target.closest(".palette-gate");
    if (!tile) return;
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ source: SOURCE_PALETTE, gateId: tile.dataset.gateId }),
    );
    e.dataTransfer.effectAllowed = "copy";
  });

  gridEl.addEventListener("dragstart", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell || cell.classList.contains("gate-I")) return;
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        source: SOURCE_CELL,
        col: Number(cell.dataset.col),
        wire: Number(cell.dataset.wire),
        gateId: cell.classList.value.match(/gate-([A-Z]+)/)?.[1] ?? "I",
      }),
    );
    e.dataTransfer.effectAllowed = "move";
  });

  gridEl.addEventListener("dragover", (e) => {
    if (!e.target.closest(".cell")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect =
      e.dataTransfer.effectAllowed === "copy" ? "copy" : "move";
  });

  gridEl.addEventListener("drop", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell) return;
    e.preventDefault();
    const data = parseTransfer(e);
    if (!data) return;
    const targetCol = Number(cell.dataset.col);
    const targetWire = Number(cell.dataset.wire);
    if (data.source === SOURCE_CELL) {
      onChange((circuit) => {
        circuit.clearCell(data.col, data.wire);
        circuit.setCell(targetCol, targetWire, data.gateId);
      });
    } else {
      onChange((circuit) => {
        circuit.setCell(targetCol, targetWire, data.gateId);
      });
    }
  });

  paletteEl.addEventListener("dragover", (e) => {
    if (e.dataTransfer.effectAllowed !== "move") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  paletteEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const data = parseTransfer(e);
    if (data?.source === SOURCE_CELL) {
      onChange((circuit) => circuit.clearCell(data.col, data.wire));
    }
  });

  document.addEventListener("dragover", (e) => {
    if (e.target.closest("#grid") || e.target.closest("#palette")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect =
      e.dataTransfer.effectAllowed === "move" ? "move" : "none";
  });

  document.addEventListener("drop", (e) => {
    if (e.target.closest("#grid") || e.target.closest("#palette")) return;
    e.preventDefault();
    const data = parseTransfer(e);
    if (data?.source === SOURCE_CELL) {
      onChange((circuit) => circuit.clearCell(data.col, data.wire));
    }
  });
}

function parseTransfer(e) {
  const raw = e.dataTransfer.getData("application/json");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
