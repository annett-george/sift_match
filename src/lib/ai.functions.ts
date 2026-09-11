import { createServerFn } from "@tanstack/react-start";

export type AiStatus = {
  aiMode: boolean;
  model: string;
  reason: string;
};

/** Reports whether server-side LLM calls are available. Keys never reach the client. */
export const getAiStatus = createServerFn({ method: "GET" }).handler(async (): Promise<AiStatus> => {
  const key = process.env["OPENAI_API_KEY"] ?? process.env["LOVABLE_API_KEY"];
  return {
    aiMode: Boolean(key),
    model: "openai/gpt-6-astra",
    reason: key
      ? "Server-side LLM calls enabled for the agent pipeline."
      : "No API key configured — running the deterministic demo pipeline.",
  };
});

/** Server-side agent enrichment. Falls back to deterministic demo output without a key. */
export const enrichWithAi = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt: string }) => input)
  .handler(async ({ data }) => {
    const key = process.env["OPENAI_API_KEY"] ?? process.env["LOVABLE_API_KEY"];
    if (!key) {
      return { aiMode: false, text: "", note: "Demo Mode — deterministic pipeline output used." };
    }
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: data.prompt,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
      }),
    });
    if (!res.ok) {
      return { aiMode: true, text: "", note: `AI request failed (${res.status}).` };
    }
    const body = await res.text();
    const text = body
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .flatMap((raw) => {
        try {
          const ev = JSON.parse(raw) as { type?: string; delta?: string };
          return ev.type === "response.output_text.delta" && ev.delta ? [ev.delta] : [];
        } catch {
          return [];
        }
      })
      .join("");
    return { aiMode: true, text, note: "AI Mode — narrative enriched by GPT-6 Astra." };
  });
