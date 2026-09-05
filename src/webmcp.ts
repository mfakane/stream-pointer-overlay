export function registerCssTool(read: () => { css: string; error: string }) {
  const context = (document as Document & {
    modelContext?: {
      registerTool: (tool: unknown, options: unknown) => unknown;
    };
  }).modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  try {
    Promise.resolve(context.registerTool({
      name: "get_pointer_css",
      title: "OBS 用 CSS を取得",
      description:
        "現在の設定から生成した OBS Custom CSS を取得します。設定の保存や変更は行いません。",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input: unknown) {
        if (
          !input || typeof input !== "object" || Array.isArray(input) ||
          Object.keys(input).length
        ) throw new Error("空のオブジェクトを指定してください。");
        const value = read();
        if (value.error) throw new Error(value.error);
        return { css: value.css };
      },
    }, { signal: lifecycle.signal })).catch(() => {});
  } catch {
    // ignore errors
  }
  return () => lifecycle.abort();
}
