const build = await new Deno.Command(Deno.execPath(), {
  args: ["task", "build"],
  stdout: "inherit",
  stderr: "inherit",
}).output();
if (!build.success) Deno.exit(build.code);
Deno.serve({ hostname: "127.0.0.1", port: 3000 }, async (request) => {
  const path = new URL(request.url).pathname;
  if (path !== "/" && path !== "/index.html" && path !== "/favicon.svg") {
    return new Response("Not found", { status: 404 });
  }
  const file = path === "/favicon.svg"
    ? "public/favicon.svg"
    : "public/index.html";
  return new Response(await Deno.readFile(file), {
    headers: {
      "content-type": file.endsWith(".svg")
        ? "image/svg+xml"
        : "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
});
