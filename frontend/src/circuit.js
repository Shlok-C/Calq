export class Circuit {
  constructor(numWires, numCols) {
    this.numWires = numWires;
    this.numCols = numCols;
    this.cells = Array.from({ length: numCols }, () =>
      Array.from({ length: numWires }, () => "I"),
    );
  }

  setCell(col, wire, gateId) {
    if (col < 0 || col >= this.numCols) return;
    if (wire < 0 || wire >= this.numWires) return;
    this.cells[col][wire] = gateId;
  }

  clearCell(col, wire) {
    this.setCell(col, wire, "I");
  }

  getCell(col, wire) {
    return this.cells[col][wire];
  }

  toJSON() {
    const columns = this.cells.map((col) =>
      col
        .map((gate, wire) => ({ wire, gate }))
        .filter((p) => p.gate !== "I"),
    );
    return {
      num_wires: this.numWires,
      num_cols: this.numCols,
      columns,
    };
  }
}
