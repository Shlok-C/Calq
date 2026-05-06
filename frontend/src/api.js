export async function simulate(circuitJson, signal) {
  const r = await fetch("/simulate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(circuitJson),
    signal,
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`/simulate ${r.status}: ${detail}`);
  }
  return r.json();
}
