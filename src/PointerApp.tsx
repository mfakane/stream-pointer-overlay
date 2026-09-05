import { useEffect, useRef, useState } from "preact/hooks";
import ImagePreview from "./ImagePreview.tsx";
import PointerSurface from "./Surface.tsx";
import { cursors, cursorUrl } from "./cursors.ts";
import {
  cssFor,
  defaults,
  hotspotXLimits,
  hotspotYLimits,
  limits,
  type Settings,
} from "./settings.ts";
import { Button, Input, RadioGroup, RadioGroupItem } from "./ui.tsx";
import { registerCssTool } from "./webmcp.ts";
export default function PointerApp() {
  const [previewImage, setPreviewImage] = useState("");
  const [imageRevision, setImageRevision] = useState(0);
  const [mode, setMode] = useState<"loading" | "setup" | "overlay">("loading");
  const [toolbarAlwaysVisible, setToolbarAlwaysVisible] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaults);
  const [notice, setNotice] = useState("");
  const cssDetails = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search),
      obs = "obsstudio" in window || /\bOBS\//i.test(navigator.userAgent);
    const overlay = !q.has("setup") && (q.has("overlay") || obs);
    document.documentElement.classList.toggle("overlay-mode", overlay);
    setMode(overlay ? "overlay" : "setup");
    return () => document.documentElement.classList.remove("overlay-mode");
  }, []);
  let css = "", error = "";
  try {
    css = cssFor(settings, toolbarAlwaysVisible);
  } catch (e) {
    error = (e as Error).message;
  }
  const latestCss = useRef({ css, error });
  latestCss.current = { css, error };
  useEffect(
    () =>
      mode === "setup" ? registerCssTool(() => latestCss.current) : undefined,
    [mode],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(css);
      setNotice("CSS をコピーしました");
    } catch {
      if (cssDetails.current) cssDetails.current.open = true;
      setNotice("下の CSS を選択してコピーしてください。");
    }
  }
  const xLimits = hotspotXLimits(settings);
  const yLimits = hotspotYLimits(settings);
  if (mode === "loading") return null;
  if (mode === "overlay") {
    return <PointerSurface />;
  }
  return (
    <main className="workspace">
      <header>
        <a className="brand" href="?setup">
          Stream Pointer
          <strong>Overlay</strong>
          <span className="commit-id">__COMMIT_ID__</span>
        </a>
        <span className="private-tag">ローカルプレビュー</span>
      </header>
      <div className="intro">
        <h1>ポインター設定</h1>
        <a className="download" href="index.html" download="index.html">
          HTML を保存 ↓
        </a>
      </div>
      <div className="preview-row">
        <PointerSurface
          preview
          toolbarAlwaysVisible={toolbarAlwaysVisible}
          settings={settings}
          previewImage={previewImage}
          onCursorScale={(scale) => setSettings((s) => ({ ...s, scale }))}
        />
        <aside className="instructions-panel">
          <h2>操作確認</h2>
          <dl>
            <div>
              <dt>移動</dt>
              <dd>プレビュー内でマウスを動かすと追従します。</dd>
            </div>
            <div>
              <dt>描画</dt>
              <dd>
                下端のツールバーで色ペン・マーカーを選び、ドラッグで描画します。消去は描画全体に適用されます。
              </dd>
            </div>
            <div>
              <dt>待機</dt>
              <dd>
                {settings.idle === 0
                  ? "自動フェードは無効です。"
                  : (settings.idle / 1000) + " 秒操作しないと消えます。"}
              </dd>
            </div>
          </dl>
          <p className="hint">
            ツールバーを配信画面に映さずに使う場合は、ブラウザソースの高さを配信画面より約
            80 px 高く設定します (例: 1080p なら 1160
            px)。下端のツールバーは配信画面の外に出るため、 OBS の「対話
            (Interact)」でだけ操作できます。線と同じ太さのカーソルを OBS
            のプレビューで確認し、位置を合わせて描画してください。
          </p>
          <div className="overlay-links">
            <label className="toolbar-option">
              <input
                type="checkbox"
                checked={toolbarAlwaysVisible}
                onChange={(e) =>
                  setToolbarAlwaysVisible(e.currentTarget.checked)}
              />
              <span>ツールバーを常時表示</span>
            </label>
          </div>
        </aside>
      </div>
      <div className="settings-row">
        <section className="settings-panel">
          <div className="section-heading">
            <h2>見た目を調整</h2>
            <Button
              variant="ghost"
              onClick={() => {
                setSettings({ ...defaults });
                setToolbarAlwaysVisible(false);
                setPreviewImage("");
                setImageRevision((v) => v + 1);
                setNotice("初期設定に戻しました");
              }}
            >
              リセット
            </Button>
          </div>
          <RadioGroup
            className="cursor-presets"
            aria-label="カーソルの種類"
            value={settings.cursor}
            onValueChange={(value) => {
              const c = cursors.find((c) => c.id === value)!;
              setSettings((s) => ({
                ...s,
                cursor: c.id,
                x: Math.round(c.x * s.size),
                y: Math.round(c.y * s.size),
                image: "",
              }));
              setPreviewImage("");
              setImageRevision((v) => v + 1);
            }}
          >
            {cursors.map((c) => (
              <label key={c.id}>
                <RadioGroupItem value={c.id} aria-label={c.name} />
                {c.id === "text"
                  ? (
                    <span className="cursor-preview-text" aria-hidden="true">
                      {settings.text || "文字"}
                    </span>
                  )
                  : (
                    <img
                      src={cursorUrl(c.id, settings.arrowColor)}
                      alt=""
                    />
                  )}
                <span>{c.name}</span>
              </label>
            ))}
          </RadioGroup>
          {settings.cursor === "arrow" && (
            <div className="cursor-color-field">
              <label className="field">
                矢印の色
                <Input
                  className="color-input"
                  type="color"
                  value={settings.arrowColor}
                  aria-label="矢印の色"
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      arrowColor: e.currentTarget.value,
                    })}
                />
              </label>
            </div>
          )}
          {settings.cursor === "text" && (
            <div className="text-fields">
              <label className="field">
                表示する文字<Input
                  value={settings.text}
                  onChange={(e) => {
                    const next = {
                      ...settings,
                      text: e.currentTarget.value,
                    };
                    const range = hotspotXLimits(next);
                    const yRange = hotspotYLimits(next);
                    setSettings({
                      ...next,
                      x: Math.min(range[1], Math.max(range[0], next.x)),
                      y: Math.min(yRange[1], Math.max(yRange[0], next.y)),
                    });
                  }}
                />
              </label>
              <p className="field-note">
                任意の文字列を入力できます。デフォルトではホットスポットは文字の中央です。
              </p>
            </div>
          )}
          {settings.cursor === "custom" && (
            <div className="custom-image-fields">
              <label className="field">
                画像パス<Input
                  value={settings.image}
                  placeholder="file:///C:/Images/pointer.png"
                  aria-describedby="local-image-help"
                  onChange={(e) =>
                    setSettings({ ...settings, image: e.currentTarget.value })}
                />
              </label>
              <p className="field-note" id="local-image-help">
                <strong>
                  Web 版からは file:/// の画像を読み込めません。
                </strong>{" "}
                ローカル画像 file:/// 指定で直接使うには、このページを HTML
                として保存し、OBS の「ローカルファイル」で開いてください。
              </p>
              <p className="field-note">
                お手持ちのファイルを選択して使うには「画像とホットスポット」で画像を選択してください。
                この場合はカスタム CSS 内に画像が保存されるため、Web
                版から直接お使いいただけます。
              </p>
            </div>
          )}
          <div className="fields">
            {([
              ["size", "ポインターサイズ", "px"],
              ["idle", "フェード待機時間", "ms"],
              ["x", "ホットスポット X", "px"],
              ["y", "ホットスポット Y", "px"],
              ["click", "波紋サイズ", "px"],
              ["width", "波紋の線幅", "px"],
            ] as const).map(([key, label, unit]) => (
              <label className="field" key={key}>
                {label}
                <div className="number-field">
                  <Input
                    type="number"
                    min={key === "x"
                      ? xLimits[0]
                      : key === "y"
                      ? yLimits[0]
                      : limits[key][0]}
                    max={key === "x"
                      ? xLimits[1]
                      : key === "y"
                      ? yLimits[1]
                      : limits[key][1]}
                    value={settings[key]}
                    onChange={(e) => {
                      const n = Number(e.currentTarget.value);
                      if (Number.isFinite(n)) {
                        const range = key === "x"
                          ? xLimits
                          : key === "y"
                          ? yLimits
                          : limits[key];
                        setSettings({
                          ...settings,
                          [key]: Math.min(
                            range[1],
                            Math.max(range[0], n),
                          ),
                        });
                      }
                    }}
                  />
                  <span>{unit}</span>
                </div>
              </label>
            ))}
            <label className="field">
              波紋の色
              <Input
                className="color-input"
                type="color"
                value={settings.clickColor}
                aria-label="波紋の色"
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    clickColor: e.currentTarget.value,
                  })}
              />
            </label>
          </div>
          <p className="field-note">
            ホットスポットは画像左上からの距離。待機時間 0
            で自動フェードを無効にします。
          </p>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="css-heading">
            <h3>Custom CSS</h3>
            <Button onClick={copy} disabled={!!error}>CSS をコピー</Button>
          </div>
          <details className="css-details" ref={cssDetails}>
            <summary>生成された CSS を表示・選択</summary>
            <textarea
              className="css-output"
              aria-label="生成された Custom CSS"
              readOnly
              value={css}
              spellcheck={false}
            />
          </details>
          <p className="notice" role="status">
            {notice || "再読み込みすると初期設定に戻ります。"}
          </p>
        </section>
        <ImagePreview
          key={imageRevision}
          settings={settings}
          onChange={setSettings}
          onImage={setPreviewImage}
        />
      </div>
      <section className="guide" aria-labelledby="obs-guide-title">
        <div className="guide-title">
          <h2 id="obs-guide-title">OBS で使う</h2>
          <a className="download" href="index.html" download="index.html">
            単一 HTML を保存 ↓
          </a>
        </div>
        <ol>
          <li>
            <strong>ブラウザソースを追加</strong>
            <p>
              本ページのアドレスを「URL」、または保存した HTML
              を「ローカルファイル」で指定。幅は配信解像度に合わせ、
              高さは配信画面より約 80 px 高くします (1920x1080 なら 1920x1160)。
            </p>
          </li>
          <li>
            <strong>Custom CSS を貼り付け</strong>
            <p>
              生成した CSS をソースの「カスタム CSS」へ設定。
            </p>
          </li>
          <li>
            <strong>「対話」でポインターを操作</strong>
            <p>
              ソースを右クリック →「対話
              (Interact)」。配信画面の外にある下端のツールバーで
              描画を操作します。常時表示にする場合は設定画面で
              「ツールバーを常時表示」をオンにして、生成された Custom CSS
              を使います。
            </p>
          </li>
        </ol>
      </section>
      <footer>
        <span>
          Stream Pointer Overlay · 0BSD ·
          <a
            href="https://github.com/mfakane/stream-pointer-overlay"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
        </span>
        <span>設定は再読み込みでリセットされます</span>
      </footer>
    </main>
  );
}
