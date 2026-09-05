export type Mode = "cursor" | "pen" | "marker" | "spotlight";
export type Brush = { mode: Mode; color: string; size: number };
export function strokePath(x: number, y: number) {
  return `M ${x} ${y} L ${x + .01} ${y}`;
}
export function attachDrawing(
  host: HTMLElement,
  layer: SVGSVGElement,
  read: () => Brush,
) {
  let active: number | null = null,
    path: SVGPathElement | null = null,
    data = "";
  const point = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    return [
      e.clientX - r.left - host.clientLeft,
      e.clientY - r.top - host.clientTop,
    ];
  };
  function finish() {
    const id = active;
    active = null;
    path = null;
    if (id !== null && host.hasPointerCapture?.(id)) {
      host.releasePointerCapture(id);
    }
  }
  function down(e: PointerEvent) {
    if (
      (e.target as Element).closest?.("[data-tools]") || e.button !== 0 ||
      active !== null
    ) return;
    const b = read();
    if (b.mode !== "pen" && b.mode !== "marker") return;
    const [x, y] = point(e);
    path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    data = strokePath(x, y);
    for (
      const [key, value] of Object.entries({
        d: data,
        fill: "none",
        stroke: b.color,
        "stroke-width": String(b.size),
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: b.mode === "marker" ? ".3" : "1",
      })
    ) path.setAttribute(key, value);
    layer.appendChild(path);
    active = e.pointerId;
    host.setPointerCapture?.(active);
    e.preventDefault();
  }
  function move(e: PointerEvent) {
    if (active !== e.pointerId || !path) return;
    const events = e.getCoalescedEvents?.() ?? [];
    for (const p of events.length ? events : [e]) {
      const [x, y] = point(p);
      data += ` L ${x} ${y}`;
    }
    path.setAttribute("d", data);
  }
  function up(e: PointerEvent) {
    if (e.pointerId === active) {
      move(e);
      finish();
    }
  }
  const cancel = (e: PointerEvent) => {
    if (e.pointerId === active) finish();
  };
  host.addEventListener("pointerdown", down as EventListener);
  host.addEventListener("pointermove", move as EventListener);
  host.addEventListener("pointerup", up as EventListener);
  host.addEventListener("pointercancel", cancel as EventListener);
  host.addEventListener("lostpointercapture", cancel as EventListener);
  globalThis.addEventListener("blur", finish);
  return {
    clear() {
      finish();
      layer.replaceChildren();
    },
    stop: finish,
    destroy() {
      finish();
      host.removeEventListener("pointerdown", down as EventListener);
      host.removeEventListener("pointermove", move as EventListener);
      host.removeEventListener("pointerup", up as EventListener);
      host.removeEventListener("pointercancel", cancel as EventListener);
      host.removeEventListener("lostpointercapture", cancel as EventListener);
      globalThis.removeEventListener("blur", finish);
    },
  };
}
