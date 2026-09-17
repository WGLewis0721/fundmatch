export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingResult {
  model: string;
  dimensions: number;
  vectors: number[][];
  usageTokens: number | null;
}

export async function createOpenAIEmbeddings(
  input: string[],
  config: {
    apiKey?: string;
    model?: string;
    dimensions?: number;
    fetch?: typeof fetch;
    timeoutMs?: number;
  },
  signal?: AbortSignal,
): Promise<EmbeddingResult> {
  if (typeof window !== "undefined") throw new Error("The embedding adapter is server-only.");
  if (!config.apiKey) throw new Error("OpenAI embedding API key is not configured.");
  if (!input.length || input.some((item) => !item.trim())) {
    throw new Error("Embedding input must contain non-empty text.");
  }

  const model = config.model ?? DEFAULT_EMBEDDING_MODEL;
  const dimensions = config.dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS;
  if (dimensions !== DEFAULT_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `FundMatch agentic-v1 expects ${DEFAULT_EMBEDDING_DIMENSIONS}-dimension embeddings; received ${dimensions}.`,
    );
  }

  const response = await (config.fetch ?? fetch)("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.any([
      AbortSignal.timeout(config.timeoutMs ?? 45000),
      ...(signal ? [signal] : []),
    ]),
    body: JSON.stringify({ model, input, dimensions, encoding_format: "float" }),
  });

  if (!response.ok) throw new Error(`Embedding request failed with HTTP ${response.status}.`);

  const body = (await response.json()) as {
    model?: string;
    data?: Array<{ index: number; embedding: number[] }>;
    usage?: { total_tokens?: number };
  };
  const rows = [...(body.data ?? [])].sort((a, b) => a.index - b.index);
  if (rows.length !== input.length) throw new Error("Embedding response count did not match input count.");
  if (rows.some((row) => row.embedding.length !== dimensions)) {
    throw new Error("Embedding response dimensions did not match the configured FundMatch vector schema.");
  }

  return {
    model: body.model ?? model,
    dimensions,
    vectors: rows.map((row) => row.embedding),
    usageTokens: body.usage?.total_tokens ?? null,
  };
}
