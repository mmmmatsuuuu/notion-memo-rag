import { NextResponse } from "next/server";
import { createEmbedding } from "../../../lib/openai/embeddings";
import { isAllowedEmail } from "../../../lib/auth/allowed-email";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";

type SearchRequestBody = {
  contextText?: unknown;
  topK?: unknown;
};

type MatchMemoRow = {
  id?: string;
  memo_url?: string;
  book_id?: string;
  book_title?: string;
  book_url?: string;
  tags?: string[] | string | null;
  note?: string | null;
  content_text?: string | null;
};

const DEFAULT_TOP_K = 6;

function normalizeTags(tags: MatchMemoRow["tags"]): string[] {
  if (Array.isArray(tags)) {
    return tags.filter((tag): tag is string => typeof tag === "string" && tag.length > 0);
  }

  if (typeof tags === "string" && tags.length > 0) {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function buildScholarQueries(row: MatchMemoRow): string[] {
  const title = row.book_title ?? "";
  const note = row.note ?? "";
  const content = (row.content_text ?? "").slice(0, 120).replace(/\s+/g, " ").trim();

  const candidates = [
    title,
    [title, note].filter(Boolean).join(" ").trim(),
    [title, content].filter(Boolean).join(" ").trim()
  ].filter(Boolean);

  return [...new Set(candidates)].slice(0, 3);
}

async function runMatchMemos(embedding: number[], topK: number): Promise<MatchMemoRow[]> {
  const supabase = createAdminClient();

  const rpcParamsList: Array<Record<string, unknown>> = [
    { query_embedding: embedding, match_count: topK },
    { query_embedding: embedding, top_k: topK },
    { p_query_embedding: embedding, p_match_count: topK },
    { embedding, match_count: topK }
  ];

  for (const params of rpcParamsList) {
    const { data, error } = await supabase.rpc("match_memos", params);

    if (!error) {
      return (data ?? []) as MatchMemoRow[];
    }
  }

  throw new Error("match_memos_rpc_failed");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isAllowedEmail(user.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

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

  try {
    const embedding = await createEmbedding(contextText);
    const rows = await runMatchMemos(embedding, DEFAULT_TOP_K);

    const results = rows.slice(0, DEFAULT_TOP_K).map((row, index) => ({
      id: row.id ?? `memo-${index + 1}`,
      memoUrl: row.memo_url ?? "",
      bookId: row.book_id ?? row.id ?? `book-${index + 1}`,
      bookTitle: row.book_title ?? "Untitled",
      bookUrl: row.book_url ?? "",
      tags: normalizeTags(row.tags),
      note: row.note ?? "",
      preview: (row.content_text ?? "").slice(0, 400),
      scholarQueries: buildScholarQueries(row)
    }));

    return NextResponse.json({
      ok: true,
      mode: "live",
      topK: DEFAULT_TOP_K,
      requestedTopK: typeof body.topK === "number" ? body.topK : undefined,
      resultCount: results.length,
      contextTextLength: contextText.length,
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "search_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
