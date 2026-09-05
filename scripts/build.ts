import { cursorById } from "../src/cursors.ts";

const git = await new Deno.Command("git", {
  args: ["rev-parse", "HEAD"],
  stdout: "piped",
  stderr: "piped",
}).output();
if (!git.success) {
  const error = new TextDecoder().decode(git.stderr).trim();
  throw new Error(`Failed to get the commit ID${error ? `: ${error}` : ""}`);
}
const commitId = new TextDecoder().decode(git.stdout).trim().slice(0, 7);
if (!commitId) throw new Error("Failed to get the commit ID");

const js = (await Deno.readTextFile(".temp/bundle.js"))
  .replaceAll("__COMMIT_ID__", commitId)
  .replaceAll(
    "</script",
    "<\\/script",
  );
const css = (await Deno.readTextFile("src/style.css")).replace(
  'url("./cursors/arrow.svg")',
  `url("${cursorById("arrow").url}")`,
);
const notices = await Deno.readTextFile("THIRD-PARTY-NOTICES.txt");
const html =
  `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stream Pointer Overlay</title><meta name="description" content="OBS 用ポインター・描画ツール。ローカル完結・設定非保存。"><style>${css}</style><script>if(!new URLSearchParams(location.search).has('setup')&&(new URLSearchParams(location.search).has('overlay')||'obsstudio' in window||/\\bOBS\\//i.test(navigator.userAgent)))document.documentElement.classList.add('overlay-mode');</script></head><body><div id="root"></div><script>${js}</script><script type="text/plain" id="third-party-notices">${
    notices.replaceAll("</script", "<\\/script")
  }</script></body></html>`;
await Deno.mkdir("public", { recursive: true });
await Deno.writeTextFile("public/index.html", html);
console.log(`Single HTML: ${new TextEncoder().encode(html).length} bytes`);
