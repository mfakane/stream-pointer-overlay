import assert from "node:assert/strict";

Deno.test("drawing interactions", async () => {
  const { attachDrawing, markerColor } = await import("../src/drawing.ts");
  class Element extends EventTarget {
    children = [];
    attributes = {};
    clientLeft = 1;
    clientTop = 1;
    captured = null;
    tools = false;
    closest() {
      return this.tools ? this : null;
    }
    getBoundingClientRect() {
      return { left: 100, top: 50 };
    }
    setAttribute(k, v) {
      this.attributes[k] = v;
    }
    appendChild(p) {
      this.children.push(p);
    }
    replaceChildren() {
      this.children = [];
    }
    setPointerCapture(id) {
      this.captured = id;
    }
    hasPointerCapture(id) {
      return this.captured === id;
    }
    releasePointerCapture() {
      this.captured = null;
    }
  }
  globalThis.window = new EventTarget();
  globalThis.document = { createElementNS: () => new Element() };
  const host = new Element(), layer = new Element();
  let brush = { mode: "pen", size: 12, color: "#ff0000" };
  const controller = attachDrawing(host, layer, () => brush);
  function fire(type, x = 111, y = 71, id = 1, button = 0) {
    host.dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), {
        clientX: x,
        clientY: y,
        pointerId: id,
        button,
      }),
    );
  }
  fire("pointerdown");
  assert.equal(host.captured, 1);
  assert.equal(layer.children.length, 1);
  assert.equal(layer.children[0].attributes["stroke-width"], "12");
  assert.match(layer.children[0].attributes.d, /^M 10 20 L 10.01 20$/);
  fire("pointermove", 121, 81, 2);
  assert.ok(!layer.children[0].attributes.d.includes("20 30"));
  fire("pointermove", 121, 81);
  fire("pointerup", 131, 91);
  assert.equal(host.captured, null);
  assert.match(layer.children[0].attributes.d, /L 20 30 L 30 40$/);
  brush = { mode: "marker", size: 32, color: "#bcf478" };
  fire("pointerdown");
  const marker = layer.children[1];
  assert.equal(marker.attributes.stroke, markerColor(brush.color));
  assert.notEqual(marker.attributes.stroke, brush.color);
  assert.equal(marker.attributes.opacity, ".55");
  assert.equal(marker.attributes["stroke-width"], "32");
  fire("pointermove", 141, 91);
  assert.equal(layer.children.length, 2);
  assert.equal(marker.attributes.opacity, ".55");
  fire("pointercancel");
  const canceled = marker.attributes.d;
  fire("pointermove", 181, 121);
  assert.equal(marker.attributes.d, canceled);
  host.tools = true;
  fire("pointerdown");
  assert.equal(layer.children.length, 2);
  host.tools = false;
  brush.mode = "spotlight";
  fire("pointerdown");
  assert.equal(layer.children.length, 2);
  brush.mode = "cursor";
  fire("pointerdown");
  assert.equal(layer.children.length, 2);
  brush.mode = "pen";
  fire("pointerdown", 111, 71, 1, 2);
  assert.equal(layer.children.length, 2);
  fire("pointerdown");
  globalThis.dispatchEvent(new Event("blur"));
  assert.equal(host.captured, null);
  controller.clear();
  assert.equal(layer.children.length, 0);
  controller.destroy();
  fire("pointerdown");
  assert.equal(layer.children.length, 0);
  console.log(
    "PASS: pen geometry/width, translucent fluorescent marker stroke, pointer capture and identity, cancel/blur, toolbar and non-drawing modes, right-click exclusion, clear and cleanup.",
  );
});
