export function attachPointer(
  host: HTMLElement,
  dot: HTMLElement,
  status: (value: string) => void,
  clickEnabled: () => boolean = () => true,
) {
  let timer: ReturnType<typeof setTimeout>;
  function move(e: PointerEvent) {
    if ((e.target as Element)?.closest?.("[data-tools]")) {
      leave();
      return;
    }
    const r = host.getBoundingClientRect();
    dot.style.left = `${e.clientX - r.left - host.clientLeft}px`;
    dot.style.top = `${e.clientY - r.top - host.clientTop}px`;
    dot.dataset.visible = "true";
    host.dataset.pointerIdle = "false";
    status(e.buttons ? "押下中" : "追従中");
    clearTimeout(timer);
    const v = getComputedStyle(host).getPropertyValue("--pointer-idle-delay")
      .trim();
    const ms = parseFloat(v) * (v.endsWith("ms") ? 1 : 1000);
    if (!e.buttons && Number.isFinite(ms) && ms > 0) {
      timer = setTimeout(() => {
        dot.dataset.visible = "false";
        host.dataset.pointerIdle = "true";
        status("フェードアウト");
      }, ms);
    }
  }
  function down(e: PointerEvent) {
    if ((e.target as Element)?.closest?.("[data-tools]")) return;
    move(e);
    if (!clickEnabled()) return;
    const r = host.getBoundingClientRect(),
      ring = document.createElement("span");
    ring.className = "click-ring";
    ring.style.left = `${e.clientX - r.left - host.clientLeft}px`;
    ring.style.top = `${e.clientY - r.top - host.clientTop}px`;
    host.appendChild(ring);
    ring.addEventListener("animationend", () => ring.remove(), { once: true });
  }
  function wheel(e: WheelEvent) {
    if (!e.ctrlKey && !e.metaKey && e.deltaY) {
      move(e as unknown as PointerEvent);
    }
  }
  function leave() {
    clearTimeout(timer);
    dot.dataset.visible = "false";
    host.dataset.pointerIdle = "true";
    status("操作待ち");
  }
  host.addEventListener("wheel", wheel, { passive: true });
  host.addEventListener("pointermove", move as EventListener);
  host.addEventListener("pointerdown", down as EventListener);
  host.addEventListener("pointerup", move as EventListener);
  host.addEventListener("pointerleave", leave);
  host.addEventListener("pointercancel", leave);
  globalThis.addEventListener("blur", leave);
  return () => {
    clearTimeout(timer);
    host.removeEventListener("wheel", wheel);
    host.removeEventListener("pointermove", move as EventListener);
    host.removeEventListener("pointerdown", down as EventListener);
    host.removeEventListener("pointerup", move as EventListener);
    host.removeEventListener("pointerleave", leave);
    host.removeEventListener("pointercancel", leave);
    globalThis.removeEventListener("blur", leave);
    host.querySelectorAll(".click-ring").forEach((x) => x.remove());
  };
}
