const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";

type OpenAIEmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
  error?: {
    message?: string;
  };
};

export async function createEmbedding(input: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("openai_api_key_missing");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input
    })
  });

  const body = (await response.json()) as OpenAIEmbeddingResponse;

  if (!response.ok) {
    throw new Error(body.error?.message ?? "openai_embedding_failed");
  }

  const embedding = body.data?.[0]?.embedding;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("openai_embedding_invalid");
  }

  return embedding;
}
