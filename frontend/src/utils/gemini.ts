/** Gemini text generation helpers — mirrors scan-shelf REST pattern */

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

type GenerateOptions = {
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
};

export async function generateGeminiText(opts: GenerateOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY is not configured", 503);
  }

  const model = opts.model || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts: Array<{ text: string }> = [];
  if (opts.system) {
    parts.push({ text: `System instructions:\n${opts.system}\n\nUser:\n${opts.prompt}` });
  } else {
    parts.push({ text: opts.prompt });
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new GeminiError("Leaf AI is briefly rate-limited. Try again in a moment.", 429);
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[gemini] generateContent failed:", res.status, errText.slice(0, 400));
    throw new GeminiError("Leaf AI is unavailable right now.", res.status >= 500 ? 503 : res.status);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ||
    "";
  if (!text.trim()) {
    throw new GeminiError("Leaf AI returned an empty response.", 502);
  }
  return text.trim();
}

export async function generateGeminiJson<T = unknown>(opts: Omit<GenerateOptions, "json">): Promise<T> {
  const raw = await generateGeminiText({ ...opts, json: true });
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
  return JSON.parse(slice) as T;
}
