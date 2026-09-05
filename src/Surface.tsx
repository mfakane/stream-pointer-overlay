import type { JSX } from "preact";
import { useEffect, useId, useRef, useState } from "preact/hooks";
import { cursorUrl } from "./cursors.ts";
import { attachDrawing, type Mode } from "./drawing.ts";
import {
  Focus,
  Highlighter,
  MousePointer2,
  PenLine,
  Trash2,
} from "./icons.tsx";
import { attachPointer } from "./pointer.ts";
import { cssString, defaults, type Settings } from "./settings.ts";
import { Button, RadioGroup, RadioGroupItem, Slider } from "./ui.tsx";
const modes = [
  { id: "cursor", label: "カーソル", icon: MousePointer2 },
  { id: "pen", label: "色ペン", icon: PenLine },
  { id: "marker", label: "マーカー", icon: Highlighter },
  { id: "spotlight", label: "スポットライト", icon: Focus },
] as const;
const colors = [
  ["#ff705b", "赤"],
  ["#ffd85c", "黄"],
  ["#bcf478", "緑"],
  ["#63c8ff", "青"],
  ["#d49bff", "紫"],
  ["#ffffff", "白"],
];
export default function Surface(
  {
    preview = false,
    settings = defaults,
    previewImage = "",
    onCursorScale,
    toolbarAlwaysVisible = false,
  }: {
    preview?: boolean;
    settings?: Settings;
    previewImage?: string;
    onCursorScale?: (scale: number) => void;
    toolbarAlwaysVisible?: boolean;
  },
) {
  const host = useRef<HTMLDivElement>(null),
    dot = useRef<HTMLDivElement>(null),
    layer = useRef<SVGSVGElement>(null);
  const [lights, setLights] = useState<
    { x: number; y: number; radius: number }[]
  >([]);
  const lightMask = "lights-" + useId().replaceAll(":", "");
  const drawing = useRef<ReturnType<typeof attachDrawing> | null>(null);
  const [mode, setMode] = useState<Mode>("cursor"),
    [color, setColor] = useState("#ff705b");
  const [sizes, setSizes] = useState({
    cursor: settings.scale,
    pen: 6,
    marker: 28,
    spotlight: 180,
  });
  const [status, setStatus] = useState("操作待ち"),
    [open, setOpen] = useState(false);
  const cursorScaleRange = { min: 0.25, max: 4, step: 0.05 } as const;
  const live = useRef({ mode, color, size: sizes[mode] });
  live.current = { mode, color, size: sizes[mode] };
  useEffect(() => {
    if (preview) setSizes((v) => ({ ...v, cursor: settings.scale }));
  }, [preview, settings.scale]);
  useEffect(() => {
    const stopPointer = attachPointer(
      host.current!,
      dot.current!,
      setStatus,
      () => live.current.mode === "cursor",
    );
    drawing.current = attachDrawing(
      host.current!,
      layer.current!,
      () => live.current,
    );
    return () => {
      stopPointer();
      drawing.current?.destroy();
    };
  }, [preview]);
  const resizeRef = useRef((_n: number) => {});
  resizeRef.current = (n: number) => {
    const current = live.current.mode;
    live.current.size = n;
    setSizes((s) => ({ ...s, [current]: n }));
    if (current === "cursor") onCursorScale?.(n);
    if (current === "cursor" && !preview) {
      host.current!.style.setProperty("--pointer-scale", String(n));
    }
  };
  useEffect(() => {
    const surface = host.current!;
    function wheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey || !e.deltaY) return;
      e.preventDefault();
      const { mode, size } = live.current;
      const min = mode === "spotlight"
          ? 40
          : mode === "cursor"
          ? cursorScaleRange.min
          : 1,
        max = mode === "spotlight"
          ? 600
          : mode === "cursor"
          ? cursorScaleRange.max
          : 100;
      const step = mode === "spotlight"
        ? 10
        : mode === "cursor"
        ? cursorScaleRange.step
        : 1;
      const next = size + (e.deltaY < 0 ? step : -step);
      resizeRef.current(
        Math.max(min, Math.min(max, Math.round(next * 100) / 100)),
      );
    }
    surface.addEventListener("wheel", wheel, { passive: false });
    return () => surface.removeEventListener("wheel", wheel);
  }, []);
  function changeMode(next: Mode) {
    drawing.current?.stop();
    setMode(next);
    dot.current!.dataset.visible = "false";
  }
  const isTextCursor = settings.cursor === "text";
  const url = previewImage || cursorUrl(settings.cursor, settings.arrowColor);
  const style = {
    ...(preview
      ? {
        "--pointer-size": `${settings.size}px`,
        "--pointer-scale": `${sizes.cursor}`,
        "--pointer-hotspot-x": `${settings.x}px`,
        "--pointer-hotspot-y": `${settings.y}px`,
        "--pointer-idle-delay": `${settings.idle}ms`,
        "--click-size": `${settings.click}px`,
        "--click-width": `${settings.width}px`,
        "--click-color": settings.clickColor,
        "--pointer-image": isTextCursor ? "none" : `url("${url}")`,
        "--pointer-text": isTextCursor ? cssString(settings.text) : '""',
        "--toolbar-always-visible": toolbarAlwaysVisible ? "1" : "0",
      }
      : {}),
    "--brush-size": `${sizes[mode]}px`,
    "--brush-color": color,
  } as JSX.CSSProperties;
  return (
    <div
      ref={host}
      className={preview ? "surface preview" : "surface overlay"}
      style={style}
      data-mode={mode}
      data-fixed-lights={lights.length > 0}
      onPointerDown={(e) => {
        if (
          mode !== "spotlight" || e.button !== 0 ||
          (e.target as Element).closest("[data-tools]")
        ) return;
        const surface = e.currentTarget;
        const r = surface.getBoundingClientRect();
        const light = {
          x: e.clientX - r.left - surface.clientLeft,
          y: e.clientY - r.top - surface.clientTop,
          radius: live.current.size / 2,
        };
        setLights((v) => [...v, light]);
        setStatus("ライトを設置しました");
      }}
      aria-label="描画とポインターの操作領域"
    >
      {preview && (
        <>
          <div className="stage-top">
            <span>
              プレビュー
            </span>
            <span>{modes.find((m) => m.id === mode)?.label}</span>
          </div>
          <div className="stage-bottom">
            <span>下端：ツール · ホイール：サイズ（カーソルは倍率）</span>
            <span>{status}</span>
          </div>
        </>
      )}
      <svg ref={layer} className="drawing-layer" aria-hidden="true" />
      {mode === "spotlight" && lights.length > 0 && (
        <svg className="spotlight-layer" aria-hidden="true">
          <defs>
            <mask
              id={lightMask}
              x="0"
              y="0"
              width="100%"
              height="100%"
              maskUnits="userSpaceOnUse"
              style={{ maskType: "luminance" }}
            >
              <rect width="100%" height="100%" fill="white" />
              {lights.map((light, i) => (
                <circle
                  key={i}
                  cx={light.x}
                  cy={light.y}
                  r={light.radius}
                  fill="black"
                />
              ))}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="black"
            mask={`url(#${lightMask})`}
          />
        </svg>
      )}
      <div
        ref={dot}
        className="stream-pointer"
        data-visible="false"
        aria-hidden="true"
      />
      <div
        data-tools
        className="toolbar-dock"
        data-open={open}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
      >
        <Button
          className="toolbar-handle"
          aria-label="ツールバーを表示"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="toolbar-grip" aria-hidden="true" />
        </Button>
        <div className="drawing-toolbar" role="group" aria-label="描画ツール">
          <RadioGroup
            className="color-palette"
            aria-label="描画色"
            value={color}
            onValueChange={(v) => setColor(String(v))}
          >
            {colors.map(([value, label]) => (
              <RadioGroupItem
                key={value}
                value={value}
                aria-label={label}
                title={label}
                style={{ backgroundColor: value }}
              />
            ))}
          </RadioGroup>
          <div className="mode-buttons">
            {modes.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                title={label}
                aria-label={label}
                aria-pressed={mode === id}
                onClick={() => changeMode(id)}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Button>
            ))}
            <Button
              title="描画とライトをすべて消去"
              aria-label="描画とライトをすべて消去"
              onClick={() => {
                drawing.current?.clear();
                setLights([]);
                dot.current!.dataset.visible = "false";
                setStatus("描画とライトを消去しました");
              }}
            >
              <Trash2 size={20} />
              <span>消去</span>
            </Button>
          </div>
          <div className="brush-slider">
            <output
              className="size-readout"
              aria-label={mode === "cursor" ? "現在の拡大率" : "現在のサイズ"}
            >
              {mode === "cursor"
                ? `${Math.round(sizes[mode] * 100)}%`
                : sizes[mode]}
              <span>{mode === "cursor" ? "倍率" : "px"}</span>
            </output>
            <Slider
              aria-label={mode === "spotlight"
                ? "照明の直径"
                : mode === "cursor"
                ? "カーソルの拡大率"
                : "線の太さ"}
              value={[sizes[mode]]}
              min={mode === "spotlight"
                ? 40
                : mode === "cursor"
                ? cursorScaleRange.min
                : 1}
              max={mode === "spotlight"
                ? 600
                : mode === "cursor"
                ? cursorScaleRange.max
                : 100}
              step={mode === "spotlight"
                ? 1
                : mode === "cursor"
                ? cursorScaleRange.step
                : 1}
              onValueChange={(v) =>
                resizeRef.current(Array.isArray(v) ? v[0] : v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
