import type { SVGAttributes } from "preact";
const icon =
  (paths: string[]) =>
  (props: SVGAttributes<SVGSVGElement> & { size?: number }) => (
    <svg
      width={props.size ?? 20}
      height={props.size ?? 20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
export const MousePointer2 = icon(["M4 3L20 13L13 14L10 21Z"]);
export const PenLine = icon([
  "M4 16L16 4L20 8L8 20H4Z",
  "M13 7L17 11",
  "M13 21H21",
]);
export const Highlighter = icon([
  "M5 13L14 4L20 10L11 19Z",
  "M6 14L10 18",
  "M4 20H12",
]);
export const Focus = icon([
  "M8 3H3V8M16 3H21V8M3 16V21H8M21 16V21H16",
  "M16 12A4 4 0 1 1 8 12A4 4 0 1 1 16 12",
]);
export const Trash2 = icon([
  "M3 6H21M9 6V3H15V6M6 6L7 21H17L18 6M10 10V17M14 10V17",
]);
export const ChevronUp = icon(["M6 15L12 9L18 15"]);
