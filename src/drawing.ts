export type Mode = "cursor" | "pen" | "marker" | "spotlight";
export type Brush = { mode: Mode; color: string; size: number };

function toHex(value: number) {
  return Math.round(value * 255).toString(16).padStart(2, "0");
}

/** Make marker strokes vivid without changing the selected palette color. */
export function markerColor(color: string) {
  const match = /^#([\da-f]{6})$/i.exec(color);
  if (!match) return color;
  const channels = [0, 2, 4].map((offset) =>
    parseInt(match[1].slice(offset, offset + 2), 16) / 255
  );
  const hsl = rgbToHsl(channels);
  if (!hsl) return color;
  const [hue, vividSaturation, vividLightness] = adjustMarkerSl(hsl);
  const chroma = (1 - Math.abs(2 * vividLightness - 1)) * vividSaturation;
  const second = chroma * (1 - Math.abs((hue * 6) % 2 - 1));
  const matchHue = hue * 6;
  const [primeRed, primeGreen, primeBlue] = matchHue < 1
    ? [chroma, second, 0]
    : matchHue < 2
    ? [second, chroma, 0]
    : matchHue < 3
    ? [0, chroma, second]
    : matchHue < 4
    ? [0, second, chroma]
    : matchHue < 5
    ? [second, 0, chroma]
    : [chroma, 0, second];
  const matchLightness = vividLightness - chroma / 2;
  return `#${toHex(primeRed + matchLightness)}${
    toHex(primeGreen + matchLightness)
  }${toHex(primeBlue + matchLightness)}`;
}

/** Convert normalized RGB channels to HSL. */
function rgbToHsl([red, green, blue]: number[]) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  if (max === min) return null;

  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  hue /= 6;
  if (hue < 0) hue += 1;
  return [hue, saturation, lightness] as const;
}

/** Adjust only saturation and lightness for marker rendering. */
function adjustMarkerSl([hue, saturation, lightness]: readonly number[]) {
  return [
    hue,
    Math.min(1, saturation * 1.1),
    Math.min(.8, Math.max(.6, lightness * 1.1)),
  ] as const;
}

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
        stroke: b.mode === "marker" ? markerColor(b.color) : b.color,
        "stroke-width": String(b.size),
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: b.mode === "marker" ? ".55" : "1",
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
