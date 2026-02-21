import type { EvidenceCard } from "../assist/contract";

const DEFAULT_ASSIST_MODEL = process.env.OPENAI_ASSIST_MODEL ?? "gpt-5.2";

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

function buildEvidenceBlock(evidenceCards: EvidenceCard[]): string {
  return evidenceCards
    .map((card, index) => {
      const label = `根拠カード[${index + 1}]`;
      const title = card.book_title ?? card.memo_title ?? "タイトル不明";
      const note = card.note || "注記なし";
      const excerpt = card.preview.replace(/\s+/g, " ").trim();
      return `${label} ${title}\nnote: ${note}\nexcerpt: ${excerpt}`;
    })
    .join("\n\n");
}

export async function createAssistNarrative(query: string, evidenceCards: EvidenceCard[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("openai_api_key_missing");
  }

  if (evidenceCards.length === 0) {
    return `「${query}」に関する根拠メモが見つかりませんでした。問いを具体化して再検索してください。`;
  }

  const evidenceBlock = buildEvidenceBlock(evidenceCards);
  const evidenceRefs = evidenceCards
    .slice(0, 6)
    .map((_, index) => `根拠カード[${index + 1}]`)
    .join("、");
  const prompt = [
    "あなたは読書メモRAGの思考支援アシスタントです。",
    "以下の根拠をもとに、問いに対する短い思考支援文を日本語で作成してください。",
    "# 根拠",
    evidenceCards,
    "#回答方針:",
    "- 問いに自然な日本語で答える。",
    "- 根拠に使ったカードを文中に 根拠カード[1] の形式で明示する。",
    "- 推測は断定せず、検討ポイントとして述べる。",
    "- 最後に1行で次のアクションを提案する。",
    "- 出力は次の形式を厳守する:",
    "  問い：{問いをそのまま再掲}",
    "  回答",
    "  {自然文本文。本文中に根拠カード参照を入れる}",
    "",
    `問い: ${query}`,
    `使用できる根拠カード参照: ${evidenceRefs}`,
    "",
    "根拠メモ:",
    evidenceBlock
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_ASSIST_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "根拠に基づく短い思考支援文を日本語で作成する。"
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const body = (await response.json()) as OpenAIChatCompletionResponse;
  if (!response.ok) {
    throw new Error(body.error?.message ?? "openai_assist_generation_failed");
  }

  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("openai_assist_generation_invalid");
  }

  return text;
}
