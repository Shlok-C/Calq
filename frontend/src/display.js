export function renderProbabilities(numWires, probabilities, rootEl) {
  rootEl.innerHTML = "";
  const heading = document.createElement("h2");
  heading.textContent = "Probabilities";
  rootEl.appendChild(heading);

  const list = document.createElement("div");
  list.className = "prob-list";

  for (let i = 0; i < probabilities.length; i++) {
    const p = probabilities[i];
    const row = document.createElement("div");
    row.className = "prob-row";

    const label = document.createElement("span");
    label.className = "prob-label";
    label.textContent = `|${formatBasis(i, numWires)}⟩`;

    const bar = document.createElement("span");
    bar.className = "prob-bar";
    const fill = document.createElement("span");
    fill.className = "prob-fill";
    fill.style.width = `${(p * 100).toFixed(2)}%`;
    bar.appendChild(fill);

    const pct = document.createElement("span");
    pct.className = "prob-pct";
    pct.textContent = `${(p * 100).toFixed(1)}%`;

    row.append(label, bar, pct);
    list.appendChild(row);
  }
  rootEl.appendChild(list);
}

function formatBasis(index, numWires) {
  let bits = "";
  for (let q = numWires - 1; q >= 0; q--) {
    bits += ((index >> q) & 1).toString();
  }
  return bits;
}
