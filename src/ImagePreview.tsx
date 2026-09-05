import type { JSX } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { cursorById, cursorUrl } from "./cursors.ts";
import { hotspotXLimits, hotspotYLimits, type Settings } from "./settings.ts";
import { Button, Input } from "./ui.tsx";

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("画像を Data URI に変換できません。"));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("画像を読み込めません。"));
    reader.onabort = () =>
      reject(new Error("画像の読み込みが中断されました。"));
    reader.readAsDataURL(file);
  });
}

export default function ImagePreview(
  { settings, onChange, onImage }: {
    settings: Settings;
    onChange: (s: Settings | ((previous: Settings) => Settings)) => void;
    onImage: (url: string) => void;
  },
) {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState("標準の矢印");
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const textContainer = useRef<HTMLSpanElement>(null);
  const textContent = useRef<HTMLSpanElement>(null);
  const [textScale, setTextScale] = useState(1);
  useEffect(() => {
    setUrl("");
    onImage("");
    setError("");
    if (!file) {
      setInfo("標準の矢印");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    let active = true;
    setInfo("画像を読み込み中…");
    image.onload = () => {
      void (async () => {
        try {
          const dataUrl = await readAsDataUrl(file);
          if (!active) return;
          setUrl(objectUrl);
          onImage(objectUrl);
          onChange((current) => ({
            ...current,
            cursor: "custom",
            image: dataUrl,
          }));
          setInfo(
            `${file.name} · ${image.naturalWidth} × ${image.naturalHeight} px`,
          );
        } catch {
          if (active) {
            setError("画像を読み込めません。もう一度選び直してください。");
            setInfo("標準の矢印");
          }
        }
      })();
    };
    image.onerror = () => {
      if (active) {
        setError(
          "画像を読み込めません。PNG・SVG・JPEG・WebP などの画像を選び直してください。",
        );
        setInfo("標準の矢印");
      }
    };
    image.src = objectUrl;
    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, onChange, onImage]);
  const isTextCursor = settings.cursor === "text";
  const xRange = hotspotXLimits(settings);
  const yRange = hotspotYLimits(settings);
  const textOverhang = isTextCursor
    ? (xRange[1] - xRange[0] - settings.size) / 2
    : 0;
  const contentMinX = Math.min(0, settings.x, isTextCursor ? xRange[0] : 0);
  const contentMaxX = Math.max(
    settings.size,
    settings.x,
    isTextCursor ? xRange[1] : 1,
  );
  const contentMinY = Math.min(
    0,
    settings.y,
    isTextCursor ? yRange[0] : 0,
  );
  const contentMaxY = Math.max(
    settings.size,
    settings.y,
    isTextCursor ? settings.size + textOverhang : 1,
  );
  const contentWidth = contentMaxX - contentMinX;
  const contentHeight = contentMaxY - contentMinY;
  const extent = Math.max(contentWidth, contentHeight, 1);
  const originX = isTextCursor
    ? contentMinX - (extent - contentWidth) / 2
    : contentMinX;
  const originY = isTextCursor
    ? contentMinY - (extent - contentHeight) / 2
    : contentMinY;
  const imageStyle = {
    width: `${
      (isTextCursor ? xRange[1] - xRange[0] : settings.size) /
      extent * 100
    }%`,
    height: `${settings.size / extent * 100}%`,
    left: `${((isTextCursor ? xRange[0] : 0) - originX) / extent * 100}%`,
    top: `${-originY / extent * 100}%`,
    backgroundImage: isTextCursor
      ? "none"
      : `url("${url || cursorUrl(settings.cursor, settings.arrowColor)}")`,
    "--hotspot-text-size": `${settings.size}px`,
    "--hotspot-text-size-ratio": `${settings.size / extent}`,
  } as JSX.CSSProperties;
  useLayoutEffect(() => {
    setTextScale(1);
    const container = textContainer.current;
    const content = textContent.current;
    if (!isTextCursor || !container || !content) return;
    const updateScale = () => {
      const width = content.offsetWidth;
      const height = content.offsetHeight;
      if (!width || !height) {
        setTextScale(1);
        return;
      }
      setTextScale(
        Math.min(
          1,
          container.clientWidth / width,
          container.clientHeight / height,
        ),
      );
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [isTextCursor, settings.text, settings.size, extent]);
  const markerX = isTextCursor
    ? settings.size / 2 + (settings.x - settings.size / 2) * textScale
    : settings.x;
  const markerY = isTextCursor
    ? settings.size / 2 + (settings.y - settings.size / 2) * textScale
    : settings.y;
  function update(x: number, y: number) {
    const xRange = hotspotXLimits(settings);
    const yRange = hotspotYLimits(settings);
    onChange({
      ...settings,
      x: Math.max(xRange[0], Math.min(xRange[1], Math.round(x))),
      y: Math.max(yRange[0], Math.min(yRange[1], Math.round(y))),
    });
  }
  return (
    <section className="image-preview-panel">
      <div className="section-heading">
        <h2>画像とホットスポット</h2>
        <span className="coordinate-readout">
          X {settings.x} / Y {settings.y} px
        </span>
      </div>
      <div className="image-preview-grid">
        <div className="hotspot-padding">
          <Button
            className="hotspot-board"
            aria-label="ホットスポットを指定。クリック、または矢印キーで 1 px ずつ調整。Enter で画像の中央。"
            onClick={(e) => {
              if (e.detail === 0) {
                update(settings.size / 2, settings.size / 2);
                return;
              }
              const r = e.currentTarget.getBoundingClientRect();
              update(
                originX + (e.clientX - r.left) / r.width * extent,
                originY + (e.clientY - r.top) / r.height * extent,
              );
            }}
            onKeyDown={(e) => {
              const d: { [key: string]: [number, number] } = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
              };
              if (d[e.key]) {
                e.preventDefault();
                update(settings.x + d[e.key][0], settings.y + d[e.key][1]);
              }
            }}
          >
            <span
              ref={textContainer}
              className={isTextCursor
                ? "hotspot-image hotspot-text"
                : "hotspot-image"}
              style={imageStyle}
            >
              {isTextCursor && (
                <span
                  ref={textContent}
                  className="hotspot-text-content"
                  style={{ transform: `scale(${textScale})` }}
                >
                  {settings.text}
                </span>
              )}
            </span>
            <span
              className="hotspot-cross"
              style={{
                left: `${(markerX - originX) / extent * 100}%`,
                top: `${(markerY - originY) / extent * 100}%`,
              }}
            />
            <span
              className="hotspot-origin"
              style={{
                left: `${-originX / extent * 100}%`,
                top: `${-originY / extent * 100}%`,
              }}
            >
              0, 0
            </span>
          </Button>
        </div>
        <div className="image-preview-controls">
          <label className="field">
            画像を選択<Input
              type="file"
              accept="image/*,.svg"
              onChange={(e) => {
                const selected = e.currentTarget.files?.[0] ?? null;
                setFile(selected);
                if (selected) {
                  onChange((current) => ({
                    ...current,
                    cursor: "custom",
                    image: "",
                  }));
                }
                e.currentTarget.value = "";
              }}
            />
          </label>
          <p className="image-info">
            {url ? info : cursorById(settings.cursor).name}
          </p>
          {error && <p className="error" role="alert">{error}</p>}
          <p className="field-note">
            画像はサーバーにアップロード等はされず、ブラウザ内でのみ読み込まれます。
          </p>
          <p className="field-note">
            十字がマウス位置です。クリックで指定、矢印キーで 1 px
            ずつ調整できます。座標は設定サイズでの左上からの距離です。
          </p>
          <Button variant="ghost" onClick={() => setFile(null)}>
            標準の矢印に戻す
          </Button>
        </div>
      </div>
    </section>
  );
}
