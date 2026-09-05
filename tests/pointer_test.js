import assert from "node:assert/strict";

Deno.test("pointer, CSS and WebMCP contracts", async () => {
  const { defaults, cssFor, hotspotXLimits, hotspotYLimits, imageUrl } =
    await import("../src/settings.ts");
  const { cursors } = await import("../src/cursors.ts");
  assert.equal(defaults.text, "🐱");
  assert.deepEqual(cursors.map((cursor) => cursor.id), [
    "arrow",
    "white",
    "cross",
    "hand",
    "text",
    "custom",
  ]);
  assert.deepEqual(cursors.find((cursor) => cursor.id === "text"), {
    id: "text",
    name: "文字",
    x: .5,
    y: .5,
    url: "",
  });
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        font: "",
        measureText: () => ({ width: 120 }),
      }),
    }),
  };
  assert.deepEqual(
    hotspotXLimits({ ...defaults, cursor: "text", text: "長い文字列" }),
    [-40, 80],
  );
  assert.deepEqual(
    hotspotYLimits({ ...defaults, cursor: "text", text: "長い文字列" }),
    [-40, 256],
  );
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
  assert.equal(
    imageUrl("C:\\Images\\a #1.png"),
    "file:///C:/Images/a%20%231.png",
  );
  assert.equal(
    imageUrl("data:image/png;base64,AA=="),
    "data:image/png;base64,AA==",
  );
  assert.throws(() => imageUrl("data:text/html,<svg></svg>"));
  assert.throws(() => imageUrl("https://example.com/p.png"));
  assert.throws(() => imageUrl("javascript:alert(1)"));
  assert.match(
    cssFor({ ...defaults, size: 88, idle: 0 }),
    /--pointer-size: 88px/,
  );
  assert.match(
    cssFor({ ...defaults, scale: 1.5 }),
    /--pointer-scale: 1\.5/,
  );
  assert.match(
    cssFor({ ...defaults, size: 88, idle: 0 }),
    /--pointer-idle-delay: 0ms/,
  );
  assert.match(
    cssFor({ ...defaults, clickColor: "#ff3366" }),
    /--click-color: #ff3366/,
  );
  assert.match(cssFor(defaults), /--toolbar-always-visible: 0/);
  assert.match(cssFor(defaults, true), /--toolbar-always-visible: 1/);
  assert.ok(!cssFor(defaults).includes("--pointer-image:"));
  assert.ok(
    cssFor({
      ...defaults,
      cursor: "custom",
      image: "file:///C:/Images/cursor.png",
    }).includes("file:///C:/Images/cursor.png"),
  );
  assert.ok(
    !cssFor({ ...defaults, image: "invalid", cursor: "arrow" }).includes(
      "--pointer-image:",
    ),
  );
  assert.ok(
    cssFor({ ...defaults, arrowColor: "#ff3366" }).includes(
      '--pointer-image: url("data:image/svg+xml',
    ),
  );
  assert.ok(cssFor({ ...defaults, cursor: "hand" }).includes("data:image/svg"));
  assert.match(
    cssFor({ ...defaults, cursor: "text", text: "猫 <3" }),
    /--pointer-image: none/,
  );
  assert.match(
    cssFor({ ...defaults, cursor: "text", text: "猫 <3" }),
    /--pointer-text: "猫 <3"/,
  );
  class Node extends EventTarget {
    style = {};
    dataset = {};
    clientLeft = 1;
    clientTop = 1;
    children = [];
    getBoundingClientRect() {
      return { left: 100, top: 50 };
    }
    appendChild(n) {
      this.children.push(n);
      n.remove = () => this.children.splice(this.children.indexOf(n), 1);
    }
    querySelectorAll() {
      return this.children.slice();
    }
  }
  globalThis.window = new EventTarget();
  globalThis.document = { createElement: () => new Node() };
  let delay = "20ms";
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => delay });
  const { attachPointer } = await import("../src/pointer.ts");
  const host = new Node(), dot = new Node();
  let state = "";
  const clean = attachPointer(host, dot, (v) => state = v);
  function fire(type, x = 150, y = 90, buttons = 0) {
    host.dispatchEvent(
      Object.assign(new Event(type), { clientX: x, clientY: y, buttons }),
    );
  }
  fire("pointermove");
  assert.equal(dot.style.left, "49px");
  assert.equal(dot.style.top, "39px");
  assert.equal(dot.dataset.visible, "true");
  assert.equal(host.dataset.pointerIdle, "false");
  await new Promise((r) => setTimeout(r, 35));
  assert.equal(dot.dataset.visible, "false");
  assert.equal(state, "フェードアウト");
  assert.equal(host.dataset.pointerIdle, "true");
  fire("pointerdown", 150, 90, 1);
  assert.equal(host.children.length, 1);
  assert.equal(host.children[0].style.left, "49px");
  assert.equal(state, "押下中");
  host.children[0].dispatchEvent(new Event("animationend"));
  assert.equal(host.children.length, 0);
  delay = "0s";
  fire("pointermove");
  await new Promise((r) => setTimeout(r, 35));
  assert.equal(dot.dataset.visible, "true");
  globalThis.dispatchEvent(new Event("blur"));
  assert.equal(dot.dataset.visible, "false");
  clean();
  fire("pointermove");
  assert.equal(dot.dataset.visible, "false");
  const { registerCssTool } = await import("../src/webmcp.ts");
  let tool, signal;
  document.modelContext = {
    registerTool: (t, o) => {
      tool = t;
      signal = o.signal;
    },
  };
  const unregister = registerCssTool(() => ({ css: "example", error: "" }));
  assert.deepEqual(tool.execute({}), { css: "example" });
  assert.throws(() => tool.execute({ unexpected: true }));
  unregister();
  assert.equal(signal.aborted, true);
  console.log(
    "PASS: CSS generation, path encoding/rejection, viewport coordinates, click cleanup, idle fade/recovery, blur, listener teardown, mocked WebMCP contract.",
  );
});
