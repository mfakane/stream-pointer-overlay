import { cursorById, cursorUrl, defaultArrowColor } from "./cursors.ts";
export const defaults = {
  size: 40,
  scale: 1,
  x: 0,
  y: 0,
  idle: 1200,
  click: 64,
  width: 3,
  clickColor: "#bcf478",
  arrowColor: defaultArrowColor,
  image: "",
  text: "🐱",
  cursor: "arrow",
};
export type Settings = typeof defaults;
export const limits = {
  size: [8, 256],
  scale: [0.25, 4],
  x: [0, 256],
  y: [0, 256],
  idle: [0, 60000],
  click: [0, 300],
  width: [0, 30],
} as const;
const textFont = "Arial,'Yu Gothic UI',Meiryo,sans-serif";
export function imageUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (/^data:image\/[^,]+,/i.test(value)) return value;
  if (/^file:\/\//i.test(value)) return new URL(value).href;
  if (/^[a-z]:[\\/]/i.test(value)) {
    return new URL(
      "file:///" +
        value.replaceAll("\\", "/").split("/").map((p, i) =>
          i === 0 ? p : encodeURIComponent(p)
        ).join("/"),
    ).href;
  }
  throw new Error(
    "file:/// で始まる URL、または C:\\Images\\pointer.png の形式で入力してください。",
  );
}
export function cssString(value: string) {
  return '"' + [...value].map((character) => {
    if (character === "\\") return "\\\\";
    if (character === '"') return '\\"';
    if (character === "\n") return "\\A ";
    if (character === "\r") return "\\D ";
    if (character === "\0") return "�";
    return character;
  }).join("") + '"';
}
function measureTextWidth(text: string, size: number) {
  if (typeof document === "undefined") return size;
  const canvas = document.createElement("canvas");
  const context = typeof canvas.getContext === "function"
    ? canvas.getContext("2d")
    : null;
  if (!context) return size;
  context.font = `${size}px ${textFont}`;
  return context.measureText(text).width;
}
function textOverhang(s: Settings) {
  const width = Math.max(s.size, measureTextWidth(s.text, s.size));
  return Math.max(0, (width - s.size) / 2);
}
export function hotspotXLimits(s: Settings): readonly [number, number] {
  if (s.cursor !== "text") return limits.x;
  const overhang = textOverhang(s);
  return [
    Math.floor(-overhang),
    Math.ceil(s.size + overhang),
  ];
}
export function hotspotYLimits(s: Settings): readonly [number, number] {
  if (s.cursor !== "text") return limits.y;
  return [Math.floor(-textOverhang(s)), limits.y[1]];
}
export function cssFor(s: Settings, toolbarAlwaysVisible = false) {
  const image = s.cursor === "custom"
    ? imageUrl(s.image)
    : s.cursor === "arrow"
    ? (s.arrowColor === defaults.arrowColor
      ? ""
      : cursorUrl(s.cursor, s.arrowColor))
    : cursorById(s.cursor).url;
  const pointer = s.cursor === "text"
    ? `\n  --pointer-image: none;\n  --pointer-text: ${cssString(s.text)};`
    : `\n  --pointer-text: "";${
      image
        ? '\n  --pointer-image: url("' + image.replaceAll('"', "%22") + '");'
        : ""
    }`;
  return `:root {\n  --pointer-size: ${s.size}px;\n  --pointer-scale: ${s.scale};\n  --pointer-hotspot-x: ${s.x}px;\n  --pointer-hotspot-y: ${s.y}px;\n  --pointer-idle-delay: ${s.idle}ms;\n  --click-size: ${s.click}px;\n  --click-width: ${s.width}px;\n  --click-color: ${s.clickColor};\n  --toolbar-always-visible: ${
    toolbarAlwaysVisible ? 1 : 0
  };${pointer}\n}\nhtml, body { background: transparent !important; margin: 0; overflow: hidden; }`;
}
