import arrowSvg from "./cursors/arrow.svg" with { type: "text" };
import crossSvg from "./cursors/cross.svg" with { type: "text" };
import customSvg from "./cursors/custom.svg" with { type: "text" };
import handSvg from "./cursors/hand.svg" with { type: "text" };
import whiteSvg from "./cursors/white.svg" with { type: "text" };

const svg = (source: string) =>
  `data:image/svg+xml,${encodeURIComponent(source)}`;
export const defaultArrowColor = "#bcf478";

export const arrowUrl = (color = defaultArrowColor) => {
  const safeColor = /^#[\da-f]{6}$/i.test(color) ? color : defaultArrowColor;
  return svg(arrowSvg.replace('fill="#bcf478"', `fill="${safeColor}"`));
};

export const cursors = [
  {
    id: "arrow",
    name: "矢印",
    x: 0,
    y: 0,
    url: svg(arrowSvg),
  },
  {
    id: "white",
    name: "白い矢印",
    x: 0,
    y: 0,
    url: svg(whiteSvg),
  },
  {
    id: "cross",
    name: "十字",
    x: .5,
    y: .5,
    url: svg(crossSvg),
  },
  {
    id: "hand",
    name: "指",
    x: .35,
    y: .075,
    url: svg(handSvg),
  },
  {
    id: "text",
    name: "文字",
    x: .5,
    y: .5,
    url: "",
  },
  {
    id: "custom",
    name: "画像",
    x: 0,
    y: 0,
    url: svg(customSvg),
  },
];
export const cursorById = (id: string) =>
  id === "custom"
    ? {
      ...cursors[cursors.length - 1],
      id: "custom",
      name: "カスタム (画像未選択)",
    }
    : cursors.find((c) => c.id === id) ?? cursors[0];

export const cursorUrl = (id: string, arrowColor = defaultArrowColor) =>
  id === "arrow" ? arrowUrl(arrowColor) : cursorById(id).url;
