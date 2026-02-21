import { NextResponse } from "next/server";
import { POST as assistPost } from "../assist/route";

type SearchRequestBody = {
  contextText?: unknown;
  topK?: unknown;
};

type AssistSuccessResponse = {
  ok: true;
  mode: "live";
  answer_k: number;
  response: string;
  evidence_cards: Array<{
    id: string;
    memo_url: string | null;
    memo_title: string | null;
    book_id: string | null;
    book_title: string | null;
    book_url: string | null;
    tags: string[];
    note: string;
    preview: string;
    scholar_queries: string[];
  }>;
};

type AssistErrorResponse = {
  ok: false;
  error: string;
};

export async function POST(request: Request) {
  let body: SearchRequestBody;

  try {
    body = (await request.json()) as SearchRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.contextText !== "string" || body.contextText.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "contextText_required" }, { status: 400 });
  }

  const contextText = body.contextText.trim();
  const assistRequest = new Request(request.url.replace("/api/search", "/api/assist"), {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({
      query: contextText
    })
  });

  const assistResponse = await assistPost(assistRequest);
  const assistBody = (await assistResponse.json()) as AssistSuccessResponse | AssistErrorResponse;

  if (!assistResponse.ok || !assistBody.ok) {
    return NextResponse.json({ ok: false, error: assistBody.ok ? "search_failed" : assistBody.error }, {
      status: assistResponse.status
    });
  }

  return NextResponse.json({
    ok: true,
    mode: assistBody.mode,
    topK: assistBody.answer_k,
    requestedTopK: typeof body.topK === "number" ? body.topK : undefined,
    resultCount: assistBody.evidence_cards.length,
    contextTextLength: contextText.length,
    results: assistBody.evidence_cards.map((card) => ({
      id: card.id,
      memoUrl: card.memo_url,
      memoTitle: card.memo_title,
      bookId: card.book_id ?? card.id,
      bookTitle: card.book_title,
      bookUrl: card.book_url,
      tags: card.tags,
      note: card.note,
      preview: card.preview,
      scholarQueries: card.scholar_queries
    }))
  });
}
